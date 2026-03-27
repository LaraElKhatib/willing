import path from 'path';

import { Response, Router } from 'express';

import { PublicCertificateSignatureResponse, PublicHomeStatsResponse } from './public.types.js';
import database from '../../db/index.js';
import { PLATFORM_SIGNATURE_UPLOAD_DIR } from '../../services/uploads/paths.js';

const publicRouter = Router();

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

export default publicRouter;
