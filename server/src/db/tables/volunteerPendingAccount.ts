import zod from 'zod';

import { emailSchema, idSchema, passwordSchema } from '../../schemas/index.js';
import { genderSchema } from '../../types.js';

import type { WithGeneratedIDAndCreatedAt } from './shared.js';

export const volunteerPendingAccountSchema = zod.object({
  id: idSchema,
  first_name: zod.string().trim().min(1, 'First name is required').max(64, 'First name must be at most 64 characters'),
  last_name: zod.string().trim().min(1, 'Last name is required').max(64, 'Last name must be at most 64 characters'),
  password: passwordSchema,
  email: emailSchema,
  gender: genderSchema,
  date_of_birth: zod
    .string()
    .min(1, 'Date of birth is required')
    .refine(str => !isNaN(Date.parse(str)), { message: 'Invalid date format' }),
  created_at: zod.date(),
  token: zod.string(),
});

export type VolunteerPendingAccount = zod.infer<typeof volunteerPendingAccountSchema>;
export type VolunteerPendingAccountTable = WithGeneratedIDAndCreatedAt<VolunteerPendingAccount>;

export const newVolunteerPendingAccountSchema = volunteerPendingAccountSchema.omit({
  id: true,
  created_at: true,
}).strict();
export type NewVolunteerPendingAccount = zod.infer<typeof newVolunteerPendingAccountSchema>;
