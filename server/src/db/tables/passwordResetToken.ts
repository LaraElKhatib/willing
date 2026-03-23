import zod from 'zod';

import { idSchema } from '../../schemas/index.js';

import type { WithGeneratedID } from './shared.js';

export const passwordResetTokenSchema = zod.object({
  id: idSchema,
  user_id: zod.number(),
  role: zod.enum(['organization', 'volunteer']),
  token: zod.string().min(1),
  expires_at: zod.date(),
  created_at: zod.date(),
});

export type PasswordResetToken = zod.infer<typeof passwordResetTokenSchema>;
export type PasswordResetTokenTable = WithGeneratedID<PasswordResetToken>;
