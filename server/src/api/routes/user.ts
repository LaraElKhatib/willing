import crypto from 'crypto';

import { Router, type Response } from 'express';
import { sql, type Kysely } from 'kysely';
import zod from 'zod';

import {
  type UserDeleteAccountResponse,
  type UserForgotPasswordResetResponse,
  type UserForgotPasswordResponse,
  type UserLoginResponse,
} from './user.types.ts';
import authorizeOnly from '../../auth/authorizeOnly.ts';
import removePassword from '../../auth/removePassword.ts';
import executeTransaction from '../../db/executeTransaction.ts';
import { type Database } from '../../db/tables/index.ts';
import { passwordSchema } from '../../schemas/index.ts';
import { compare, hash } from '../../services/bcrypt/index.ts';
import { generateJWT } from '../../services/jwt/index.ts';
import { sendPasswordResetEmail } from '../../services/smtp/emails.ts';
import { loginInfoSchema } from '../../types.ts';

const organizationLoginColumns = [
  'id',
  'name',
  'email',
  'phone_number',
  'url',
  'latitude',
  'longitude',
  'location_name',
  'password',
  'token_version',
] as const;

const volunteerLoginColumns = [
  'id',
  'first_name',
  'last_name',
  'email',
  'password',
  'date_of_birth',
  'gender',
  'cv_path',
  'description',
  'token_version',
] as const;

const forgotPasswordRequestSchema = zod.object({
  email: zod.string().email(),
});

const forgotPasswordResetSchema = zod.object({
  key: zod.string().min(1),
  password: passwordSchema,
});

function createUserRouter(db: Kysely<Database>) {
  const userRouter = Router();

  userRouter.post('/login', async (req, res: Response<UserLoginResponse>) => {
    const body = loginInfoSchema.parse(req.body);

    const organizationAccount = await db
      .selectFrom('organization_account')
      .select(organizationLoginColumns)
      .where('organization_account.email', '=', body.email)
      .where('organization_account.is_deleted', '=', false)
      .where('organization_account.is_disabled', '=', false)
      .executeTakeFirst();

    let volunteerAccount;
    if (!organizationAccount) {
      volunteerAccount = await db
        .selectFrom('volunteer_account')
        .select(volunteerLoginColumns)
        .where('volunteer_account.email', '=', body.email)
        .where('volunteer_account.is_deleted', '=', false)
        .where('volunteer_account.is_disabled', '=', false)
        .executeTakeFirst();
    }

    if (!organizationAccount && !volunteerAccount) {
      res.status(403);
      throw new Error('Invalid email or password');
    }

    const valid = organizationAccount
      ? await compare(body.password, organizationAccount.password)
      : volunteerAccount
        ? await compare(body.password, volunteerAccount.password)
        : false;

    if (!valid) {
      res.status(403);
      throw new Error('Invalid email or password');
    }

    const account = organizationAccount || volunteerAccount!;
    const role = organizationAccount ? 'organization' : 'volunteer';

    const token = await generateJWT({
      id: account.id,
      role,
      token_version: account.token_version,
    });

    res.json({
      token,
      role,
      [role]: removePassword(account),
    });
  });

  userRouter.post('/forgot-password', async (req, res: Response<UserForgotPasswordResponse>) => {
    const body = forgotPasswordRequestSchema.parse(req.body);

    const organizationAccount = await db
      .selectFrom('organization_account')
      .select(['id', 'name', 'email'])
      .where('organization_account.email', '=', body.email)
      .where('organization_account.is_deleted', '=', false)
      .where('organization_account.is_disabled', '=', false)
      .executeTakeFirst();

    let role: 'organization' | 'volunteer' | null = null;
    let volunteerAccount;

    if (organizationAccount) {
      role = 'organization';
    } else {
      volunteerAccount = await db
        .selectFrom('volunteer_account')
        .select(['id', 'first_name', 'last_name', 'email'])
        .where('volunteer_account.email', '=', body.email)
        .where('volunteer_account.is_deleted', '=', false)
        .where('volunteer_account.is_disabled', '=', false)
        .executeTakeFirst();

      if (volunteerAccount) {
        role = 'volunteer';
      }
    }

    if (!organizationAccount && !volunteerAccount) {
      res.json({});
      return;
    }

    const account = organizationAccount || volunteerAccount!;
    const accountName = organizationAccount
      ? organizationAccount.name
      : `${volunteerAccount!.first_name} ${volunteerAccount!.last_name}`;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await db
      .insertInto('password_reset_token')
      .values({
        user_id: account.id,
        role: role!,
        token: resetToken,
        expires_at: expiresAt,
        created_at: new Date(),
      })
      .execute();

    await sendPasswordResetEmail(body.email, accountName, resetToken);

    res.json({});
  });

  userRouter.post('/forgot-password/reset', async (req, res: Response<UserForgotPasswordResetResponse>) => {
    const body = forgotPasswordResetSchema.parse(req.body);

    const resetToken = await db
      .selectFrom('password_reset_token')
      .selectAll()
      .where('password_reset_token.token', '=', body.key)
      .executeTakeFirst();

    if (!resetToken) {
      res.status(400);
      throw new Error('Invalid or expired reset token');
    }

    if (new Date() > resetToken.expires_at) {
      res.status(400);
      throw new Error('Reset token has expired');
    }

    const hashedPassword = await hash(body.password);

    if (resetToken.role === 'organization') {
      const updateResult = await db
        .updateTable('organization_account')
        .where('id', '=', resetToken.user_id)
        .where('is_deleted', '=', false)
        .where('is_disabled', '=', false)
        .set({ password: hashedPassword, token_version: sql`token_version + 1` })
        .executeTakeFirst();

      if (Number(updateResult?.numUpdatedRows ?? 0) === 0) {
        res.status(400);
        throw new Error('Account is no longer active');
      }
    } else if (resetToken.role === 'volunteer') {
      const updateResult = await db
        .updateTable('volunteer_account')
        .where('id', '=', resetToken.user_id)
        .where('is_deleted', '=', false)
        .where('is_disabled', '=', false)
        .set({ password: hashedPassword, token_version: sql`token_version + 1` })
        .executeTakeFirst();

      if (Number(updateResult?.numUpdatedRows ?? 0) === 0) {
        res.status(400);
        throw new Error('Account is no longer active');
      }
    }

    await db
      .deleteFrom('password_reset_token')
      .where('password_reset_token.id', '=', resetToken.id)
      .execute();

    res.json({});
  });

  userRouter.delete('/account', authorizeOnly('organization', 'volunteer'), async (req, res: Response<UserDeleteAccountResponse>) => {
    const userId = req.userJWT!.id;
    const role = req.userJWT!.role as 'organization' | 'volunteer';

    const table = role === 'organization' ? 'organization_account' as const : 'volunteer_account' as const;

    await executeTransaction(db, async (trx) => {
      await trx
        .updateTable(table)
        .set({
          is_deleted: true,
          email: sql`CONCAT('deleted_', id, '_', EXTRACT(EPOCH FROM NOW())::bigint, '@deleted')`,
          token_version: sql`token_version + 1`,
        })
        .where('id', '=', userId)
        .where('is_deleted', '=', false)
        .execute();

      await trx
        .deleteFrom('password_reset_token')
        .where('role', '=', role)
        .where('user_id', '=', userId)
        .execute();
    });

    res.json({});
  });

  return userRouter;
}

export default createUserRouter;
