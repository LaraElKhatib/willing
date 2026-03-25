import zod from 'zod';

import { idSchema } from '../../schemas/index.js';

import type { WithGeneratedID } from './shared.js';

export const enrollmentApplicationDateSchema = zod.object({
  id: idSchema,
  application_id: zod.number().optional(),
  date: zod.string().refine(str => !isNaN(Date.parse(str)), { message: 'Invalid date format' }),
});

export type EnrollmentApplicationDate = zod.infer<typeof enrollmentApplicationDateSchema>;
export type EnrollmentApplicationDateTable = WithGeneratedID<EnrollmentApplicationDate>;

export const newEnrollmentApplicationDateSchema = zod.object({
  date: zod.string().refine(str => !isNaN(Date.parse(str)), { message: 'Invalid date format' }),
}).strict();
export type NewEnrollmentApplicationDate = zod.infer<typeof newEnrollmentApplicationDateSchema>;

export const enrollmentApplicationDateInsertSchema = newEnrollmentApplicationDateSchema.extend({
  application_id: zod.number(),
}).strict();
export type EnrollmentApplicationDateInsert = zod.infer<typeof enrollmentApplicationDateInsertSchema>;
