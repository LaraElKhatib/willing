import { z } from 'zod';

import { newVolunteerAccountSchema } from '../../../server/src/db/tables';

export const volunteerSignupSchema = newVolunteerAccountSchema
  .extend({
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type VolunteerSignupFormData = z.infer<typeof volunteerSignupSchema>;
