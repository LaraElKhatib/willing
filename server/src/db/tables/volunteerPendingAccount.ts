import zod from 'zod';

import { emailSchema, genderSchema, idSchema, passwordSchema } from '../../schemas/index.ts';

import type { WithGeneratedIDAndCreatedAt } from './shared.ts';

export const volunteerPendingAccountSchema = zod.object({
  id: idSchema,
  first_name: zod.string().trim().min(1, 'First name is required').max(64, 'First name must be at most 64 characters'),
  last_name: zod.string().trim().min(1, 'Last name is required').max(64, 'Last name must be at most 64 characters'),
  password: passwordSchema,
  email: emailSchema,
  gender: genderSchema,
  date_of_birth: zod.coerce.date({
    error: (issue) => {
      if (issue.code === 'invalid_type') return 'Date is required';
      return 'Invalid date format';
    },
  }),
  created_at: zod.date(),
  token: zod.string().min(1),
});

export type VolunteerPendingAccount = zod.infer<typeof volunteerPendingAccountSchema>;
export type VolunteerPendingAccountTable = WithGeneratedIDAndCreatedAt<VolunteerPendingAccount>;

export const newVolunteerPendingAccountSchema = volunteerPendingAccountSchema.omit({
  id: true,
  created_at: true,
  token: true,
}).strict();
export type NewVolunteerPendingAccount = zod.infer<typeof newVolunteerPendingAccountSchema>;
