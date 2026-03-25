import zod from 'zod';

import { idSchema } from '../../schemas/index.js';

import type { WithGeneratedIDAndCreatedAt } from './shared.js';

export const volunteerReportSchema = zod.object({
  id: idSchema,
  reported_volunteer_id: zod.number().optional(),
  reporter_organization_id: zod.number().optional(),
  title: zod.string().trim().min(1, 'Title is required').max(128, 'Title must be at most 128 characters'),
  message: zod.string().trim().min(1, 'Message is required'),
  created_at: zod.date(),
});

export type VolunteerReport = zod.infer<typeof volunteerReportSchema>;
export type VolunteerReportTable = WithGeneratedIDAndCreatedAt<VolunteerReport>;

export const newVolunteerReportSchema = zod.object({
  title: zod.string().trim().min(1, 'Title is required').max(128, 'Title must be at most 128 characters'),
  message: zod.string().trim().min(1, 'Message is required'),
}).strict();
export type NewVolunteerReport = zod.infer<typeof newVolunteerReportSchema>;

export const volunteerReportInsertSchema = newVolunteerReportSchema.extend({
  reported_volunteer_id: zod.number(),
  reporter_organization_id: zod.number(),
}).strict();
export type VolunteerReportInsert = zod.infer<typeof volunteerReportInsertSchema>;
