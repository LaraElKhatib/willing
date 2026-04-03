import zod from 'zod';

import { emailSchema, idSchema, passwordSchema } from '../../schemas/index.ts';

import type { WithGeneratedColumns, WithGeneratedIDAndTimestamps } from './shared.ts';

export const adminAccountSchema = zod.object({
  id: idSchema,
  first_name: zod.string().min(1, 'first name should have at least 1 character'),
  last_name: zod.string().min(1, 'last name should have at least 1 character'),
  email: emailSchema,
  password: passwordSchema,
  token_version: zod.number().int().nonnegative().default(0),
  updated_at: zod.date(),
  created_at: zod.date(),
});

export type AdminAccount = zod.infer<typeof adminAccountSchema>;

export type AdminAccountTable = WithGeneratedIDAndTimestamps<WithGeneratedColumns<AdminAccount, 'token_version'>>;

export const newAdminAccountSchema = adminAccountSchema.omit({ id: true, created_at: true, updated_at: true, token_version: true }).strict();
export type NewAdminAccount = zod.infer<typeof newAdminAccountSchema>;

export const adminAccountUpdate = adminAccountSchema.omit({ password: true, token_version: true, created_at: true, updated_at: true });
export type AdminAccountWithoutPassword = zod.infer<typeof adminAccountUpdate>;
