import zod from 'zod';

import { emailSchema, idSchema, passwordSchema } from '../../schemas/index.js';
import { genderSchema } from '../../types.js';

import type { WithGeneratedIDAndTimestamps } from './shared.js';

export const volunteerAccountSchema = zod.object({
  id: idSchema,
  first_name: zod.string().min(1, 'First name is required'),
  last_name: zod.string().min(1, 'Last name is required'),
  email: emailSchema,
  password: passwordSchema,
  date_of_birth: zod
    .string()
    .min(1, 'Date of birth is required')
    .refine(str => !isNaN(Date.parse(str)), { message: 'Invalid date format' }),
  gender: genderSchema,
  cv_path: zod.string().trim().max(256, 'CV path must be at most 256 characters').optional(),
  description: zod.string().max(500, 'Description must be less than 500 characters').optional(),
  privacy: zod.enum(['public', 'private']),
  profile_vector: zod.string().optional(),
  experience_vector: zod.string().optional(),
  is_disabled: zod.boolean().optional(),
  is_deleted: zod.boolean().optional(),
  updated_at: zod.date(),
  created_at: zod.date(),
});
export type VolunteerAccount = zod.infer<typeof volunteerAccountSchema>;

export type VolunteerAccountTable = WithGeneratedIDAndTimestamps<VolunteerAccount>;

export const newVolunteerAccountSchema = volunteerAccountSchema.omit({
  id: true,
  privacy: true,
  cv_path: true,
  description: true,
  profile_vector: true,
  experience_vector: true,
  is_disabled: true,
  is_deleted: true,
  created_at: true,
  updated_at: true,
}).strict();
export type NewVolunteerAccount = zod.infer<typeof newVolunteerAccountSchema>;

export const volunteerAccountWithoutPasswordSchema = volunteerAccountSchema.omit({
  password: true,
  profile_vector: true,
  experience_vector: true,
  is_disabled: true,
  is_deleted: true,
  created_at: true,
  updated_at: true,
});
export type VolunteerAccountWithoutPassword = zod.infer<typeof volunteerAccountWithoutPasswordSchema>;
