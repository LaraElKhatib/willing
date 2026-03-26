import zod from 'zod';

import { idSchema } from '../../schemas/index.js';

import type { WithGeneratedIDAndCreatedAt } from './shared.js';

export const organizationReportSchema = zod.object({
  id: idSchema,
  reported_organization_id: zod.number(),
  reporter_volunteer_id: zod.number(),
  title: zod.string().trim().min(1, 'Title is required').max(128, 'Title must be at most 128 characters'),
  message: zod.string().trim().min(1, 'Message is required'),
  created_at: zod.date(),
});

export type OrganizationReport = zod.infer<typeof organizationReportSchema>;
export type OrganizationReportTable = WithGeneratedIDAndCreatedAt<OrganizationReport>;

export const newOrganizationReportSchema = zod.object({
  title: zod.string().trim().min(1, 'Title is required').max(128, 'Title must be at most 128 characters'),
  message: zod.string().trim().min(1, 'Message is required'),
}).strict();
export type NewOrganizationReport = zod.infer<typeof newOrganizationReportSchema>;

export const organizationReportInsertSchema = newOrganizationReportSchema.extend({
  reported_organization_id: zod.number(),
  reporter_volunteer_id: zod.number(),
}).strict();
export type OrganizationReportInsert = zod.infer<typeof organizationReportInsertSchema>;
