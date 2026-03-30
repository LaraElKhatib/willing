import path from 'path';

import { type Request, type Response, Router } from 'express';
import zod from 'zod';

import {
  type PublicCertificateSignatureResponse,
  type PublicCertificateVerificationResponse,
  type PublicHomeStatsResponse,
} from './public.types.ts';
import config from '../../config.ts';
import database from '../../db/index.ts';
import { verifySignedCertificateToken } from '../../services/certificates/token.ts';
import { verifyCertificatePayloadAgainstDatabase } from '../../services/certificates/verification.ts';
import { PLATFORM_SIGNATURE_UPLOAD_DIR } from '../../services/uploads/paths.ts';

const publicRouter = Router();
const certificateVerificationBodySchema = zod.object({
  token: zod.string().trim().min(1, 'Certificate token is required.'),
});

const VERIFICATION_RATE_LIMIT_WINDOW_MS = 60_000;
const VERIFICATION_RATE_LIMIT_MAX_ATTEMPTS = 20;
const verificationRateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const getRequestSource = (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    const firstForwardedAddress = forwardedFor.split(',')[0]?.trim();
    if (firstForwardedAddress) return firstForwardedAddress;
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    const firstForwardedAddress = forwardedFor[0];
    if (firstForwardedAddress) return firstForwardedAddress;
  }
  return req.ip || 'unknown';
};

const isRateLimited = (source: string) => {
  const now = Date.now();

  if (verificationRateLimitBuckets.size > 2000) {
    verificationRateLimitBuckets.forEach((entry, key) => {
      if (entry.resetAt <= now) verificationRateLimitBuckets.delete(key);
    });
  }

  const bucket = verificationRateLimitBuckets.get(source);

  if (!bucket || bucket.resetAt <= now) {
    verificationRateLimitBuckets.set(source, {
      count: 1,
      resetAt: now + VERIFICATION_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (bucket.count >= VERIFICATION_RATE_LIMIT_MAX_ATTEMPTS) {
    return true;
  }

  bucket.count += 1;
  verificationRateLimitBuckets.set(source, bucket);
  return false;
};

publicRouter.get('/home-stats', async (_req, res: Response<PublicHomeStatsResponse>) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [postingsResult, organizationsResult, volunteersResult, newPostingsResult, newOrganizationsResult, newVolunteersResult] = await Promise.all([
    database
      .selectFrom('organization_posting')
      .select(eb => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('organization_account')
      .select(eb => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('volunteer_account')
      .select(eb => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('organization_posting')
      .select(eb => eb.fn.countAll().as('count'))
      .where('created_at', '>=', weekAgo)
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('organization_account')
      .select(eb => eb.fn.countAll().as('count'))
      .where('created_at', '>=', weekAgo)
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('volunteer_account')
      .select(eb => eb.fn.countAll().as('count'))
      .where('created_at', '>=', weekAgo)
      .executeTakeFirstOrThrow(),
  ]);

  res.json({
    totalOpportunities: Number(postingsResult.count),
    totalOrganizations: Number(organizationsResult.count),
    totalVolunteers: Number(volunteersResult.count),
    newOpportunitiesThisWeek: Number(newPostingsResult.count),
    newOrganizationsThisWeek: Number(newOrganizationsResult.count),
    newVolunteersThisWeek: Number(newVolunteersResult.count),
  });
});

publicRouter.get('/certificate-signature', async (_req, res: Response<PublicCertificateSignatureResponse>, next) => {
  const settings = await database
    .selectFrom('platform_certificate_settings')
    .select(['signature_path'])
    .orderBy('id', 'desc')
    .executeTakeFirst();

  if (!settings?.signature_path) {
    res.status(404);
    throw new Error('Certificate signature not found');
  }

  const ext = path.extname(settings.signature_path).toLowerCase();
  if (ext === '.png') {
    res.setHeader('Content-Type', 'image/png');
  } else if (ext === '.svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
  } else {
    res.setHeader('Content-Type', 'image/jpeg');
  }
  res.setHeader('Content-Disposition', 'inline; filename="platform-certificate-signature"');

  res.sendFile(settings.signature_path, { root: PLATFORM_SIGNATURE_UPLOAD_DIR }, (error) => {
    if (!error) return;
    next(error);
  });
});

publicRouter.post('/certificate/verify', async (req, res: Response<PublicCertificateVerificationResponse>) => {
  const source = getRequestSource(req);
  if (isRateLimited(source)) {
    res.setHeader('Retry-After', String(Math.ceil(VERIFICATION_RATE_LIMIT_WINDOW_MS / 1000)));
    res.status(429).json({
      valid: false,
      message: 'Too many verification attempts. Please retry in a minute.',
    });
    return;
  }

  const parsedBody = certificateVerificationBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      valid: false,
      message: 'Invalid certificate token format.',
    });
    return;
  }

  const body = parsedBody.data;
  const tokenResult = verifySignedCertificateToken(body.token, config.CERTIFICATE_VERIFICATION_SECRET);

  if (!tokenResult.valid) {
    if (tokenResult.reason === 'malformed') {
      res.status(400).json({
        valid: false,
        message: 'Invalid certificate token format.',
      });
      return;
    }

    res.json({
      valid: false,
      message: 'Certificate is invalid.',
    });
    return;
  }

  const dbVerification = await verifyCertificatePayloadAgainstDatabase(tokenResult.payload);
  if (!dbVerification.valid) {
    res.json({
      valid: false,
      message: 'Certificate is invalid.',
    });
    return;
  }

  const volunteerId = Number(tokenResult.payload.uid);
  const volunteer = await database
    .selectFrom('volunteer_account')
    .select(['first_name', 'last_name'])
    .where('id', '=', volunteerId)
    .executeTakeFirst();

  if (!volunteer) {
    res.json({
      valid: false,
      message: 'Certificate is invalid.',
    });
    return;
  }

  const organizationIds = tokenResult.payload.org_ids.map(Number);
  const organizations = organizationIds.length === 0
    ? []
    : await database
        .selectFrom('organization_account')
        .select(['id', 'name'])
        .where('id', 'in', organizationIds)
        .execute();

  const organizationNameById = new Map<number, string>();
  organizations.forEach((organization) => {
    organizationNameById.set(organization.id, organization.name);
  });

  res.json({
    valid: true,
    message: 'Certificate is valid.',
    issued_at: tokenResult.payload.issued_at,
    certificate_type: tokenResult.payload.type,
    volunteer_name: `${volunteer.first_name} ${volunteer.last_name}`.trim(),
    total_hours: tokenResult.payload.total_hours,
    organizations: organizationIds
      .filter(orgId => organizationNameById.has(orgId))
      .map(orgId => ({
        id: orgId,
        name: organizationNameById.get(orgId) ?? `Organization ${orgId}`,
        hours: tokenResult.payload.hours_per_org[String(orgId)] ?? 0,
      })),
  });
});

export default publicRouter;
