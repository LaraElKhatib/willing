import { type Request, type Response } from 'express';
import { sql, type Kysely } from 'kysely';
import zod from 'zod';

import { type Database } from '../db/tables/index.ts';
import { passwordSchema } from '../schemas/index.ts';
import { compare, hash } from '../services/bcrypt/index.ts';
import { generateJWT } from '../services/jwt/index.ts';

export interface ResetPasswordResponse {
  token: string;
}

export default function createResetPassword(database: Kysely<Database>) {
  return async (req: Request, res: Response<ResetPasswordResponse>) => {
    const body = zod.object({
      currentPassword: zod.string().min(1),
      newPassword: passwordSchema,
    }).parse(req.body);

    const role = req.userJWT!.role;

    const accountTable = {
      admin: 'admin_account',
      organization: 'organization_account',
      volunteer: 'volunteer_account',
    }[role] as keyof Database;

    const { password: currentPasswordHash } = await database
      .selectFrom(accountTable)
      .select('password')
      .where('id', '=', req.userJWT!.id)
      .executeTakeFirstOrThrow();

    const valid = await compare(body.currentPassword, currentPasswordHash);
    if (!valid) {
      res.status(403);
      throw new Error('Incorrect password');
    }

    await database
      .updateTable(accountTable)
      .where('id', '=', req.userJWT!.id)
      .set({
        password: await hash(body.newPassword),
        token_version: sql`token_version + 1`,
      })
      .execute();

    const { token_version } = await database
      .selectFrom(accountTable)
      .select('token_version')
      .where('id', '=', req.userJWT!.id)
      .executeTakeFirstOrThrow();

    const token = await generateJWT({
      id: req.userJWT!.id,
      role: req.userJWT!.role,
      token_version,
    });

    res.json({ token });
  };
}
