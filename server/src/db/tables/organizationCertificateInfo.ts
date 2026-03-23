import zod from 'zod';

import { idSchema } from '../../schemas/index.js';

import type { WithGeneratedID } from './shared.js';

export const organizationCertificateInfoSchema = zod.object({
  id: idSchema,
  hours_threshold: zod.number().int().min(0, 'Hours threshold must be >= 0').nullable(),
  signatory_name: zod.string().max(128, 'Signatory name must be at most 128 characters').nullable(),
  signature_path: zod.string().max(256, 'Signature path must be at most 256 characters').nullable(),
});

export type OrganizationCertificateInfo = zod.infer<typeof organizationCertificateInfoSchema>;

export type OrganizationCertificateInfoTable = WithGeneratedID<OrganizationCertificateInfo>;

export const newOrganizationCertificateInfoSchema = organizationCertificateInfoSchema.omit({
  id: true,
}).strict();
export type NewOrganizationCertificateInfo = zod.infer<typeof newOrganizationCertificateInfoSchema>;
