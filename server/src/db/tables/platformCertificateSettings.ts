import zod from 'zod';

import { WithGeneratedIDAndTimestamps } from './shared.js';

export const platformCertificateSettingsSchema = zod.object({
  id: zod.number(),
  signatory_name: zod.string().max(128, 'Signatory name must be at most 128 characters').nullable(),
  signatory_position: zod.string().max(128, 'Signatory position must be at most 128 characters').nullable(),
  signature_path: zod.string().max(256, 'Signature path must be at most 256 characters').nullable(),
  signature_uploaded_by_admin_id: zod.number().nullable(),
  created_at: zod.date(),
  updated_at: zod.date(),
});
export type PlatformCertificateSettings = zod.infer<typeof platformCertificateSettingsSchema>;
export type PlatformCertificateSettingsTable = WithGeneratedIDAndTimestamps<PlatformCertificateSettings>;

export const newPlatformCertificateSettingsSchema = platformCertificateSettingsSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).strict();
export type NewPlatformCertificateSettings = zod.infer<typeof newPlatformCertificateSettingsSchema>;
