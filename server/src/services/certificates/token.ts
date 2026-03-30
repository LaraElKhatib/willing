import crypto from 'crypto';

import zod from 'zod';

export const CERTIFICATE_PAYLOAD_VERSION = 1 as const;
export const CERTIFICATE_TYPE = 'volunteer_hours_certificate' as const;
const HOURS_DECIMAL_PLACES = 2;

const orgIdStringSchema = zod.string().regex(/^[1-9]\d*$/, 'Organization IDs must be positive integers');

export const certificateVerificationPayloadSchema = zod.object({
  v: zod.literal(CERTIFICATE_PAYLOAD_VERSION),
  uid: zod.string().regex(/^[1-9]\d*$/, 'User ID must be a positive integer'),
  issued_at: zod.string().datetime({ offset: true }),
  org_ids: zod.array(orgIdStringSchema).max(4, 'Up to 4 organization IDs are allowed'),
  total_hours: zod.number().finite().nonnegative(),
  hours_per_org: zod.record(orgIdStringSchema, zod.number().finite().nonnegative()),
  type: zod.literal(CERTIFICATE_TYPE),
}).superRefine((payload, ctx) => {
  const uniqueOrgIds = new Set(payload.org_ids);
  if (uniqueOrgIds.size !== payload.org_ids.length) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      path: ['org_ids'],
      message: 'Organization IDs must be unique.',
    });
  }

  const payloadOrgIds = new Set(payload.org_ids);
  const hoursOrgIds = Object.keys(payload.hours_per_org);

  for (const orgId of payload.org_ids) {
    if (!(orgId in payload.hours_per_org)) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ['hours_per_org', orgId],
        message: `Missing hours for organization ${orgId}.`,
      });
    }
  }

  for (const orgId of hoursOrgIds) {
    if (!payloadOrgIds.has(orgId)) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ['hours_per_org', orgId],
        message: `Organization ${orgId} is not listed in org_ids.`,
      });
    }
  }
});

export type CertificateVerificationPayload = zod.infer<typeof certificateVerificationPayloadSchema>;

type VerifiedTokenResult = { valid: true; payload: CertificateVerificationPayload } | { valid: false; reason: 'malformed' | 'invalid_signature' | 'invalid_payload' };

const roundHours = (value: number) => Number(value.toFixed(HOURS_DECIMAL_PLACES));

const toCanonicalPayload = (payload: CertificateVerificationPayload): CertificateVerificationPayload => {
  const sortedOrgIds = [...payload.org_ids].sort((left, right) => Number(left) - Number(right));
  const hoursPerOrg: Record<string, number> = {};

  sortedOrgIds.forEach((orgId) => {
    hoursPerOrg[orgId] = roundHours(payload.hours_per_org[orgId] ?? 0);
  });

  return {
    v: CERTIFICATE_PAYLOAD_VERSION,
    uid: payload.uid,
    issued_at: new Date(payload.issued_at).toISOString(),
    org_ids: sortedOrgIds,
    total_hours: roundHours(payload.total_hours),
    hours_per_org: hoursPerOrg,
    type: CERTIFICATE_TYPE,
  };
};

const getSignature = (payloadBytes: Buffer, secret: string) =>
  crypto.createHmac('sha256', secret).update(payloadBytes).digest();

export const signCertificateVerificationPayload = (
  rawPayload: CertificateVerificationPayload,
  secret: string,
) => {
  const payload = toCanonicalPayload(rawPayload);
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = getSignature(payloadBytes, secret);

  return `${payloadBytes.toString('base64url')}.${signature.toString('base64url')}`;
};

export const verifySignedCertificateToken = (
  token: string,
  secret: string,
): VerifiedTokenResult => {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'malformed' };
  }

  let payloadBytes: Buffer;
  let signatureBytes: Buffer;
  try {
    payloadBytes = Buffer.from(parts[0], 'base64url');
    signatureBytes = Buffer.from(parts[1], 'base64url');
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  if (payloadBytes.length === 0 || signatureBytes.length === 0) {
    return { valid: false, reason: 'malformed' };
  }

  const expectedSignature = getSignature(payloadBytes, secret);
  if (
    signatureBytes.length !== expectedSignature.length
    || !crypto.timingSafeEqual(signatureBytes, expectedSignature)
  ) {
    return { valid: false, reason: 'invalid_signature' };
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payloadBytes.toString('utf8'));
  } catch {
    return { valid: false, reason: 'invalid_payload' };
  }

  const payloadParseResult = certificateVerificationPayloadSchema.safeParse(parsedPayload);
  if (!payloadParseResult.success) {
    return { valid: false, reason: 'invalid_payload' };
  }

  return { valid: true, payload: toCanonicalPayload(payloadParseResult.data) };
};
