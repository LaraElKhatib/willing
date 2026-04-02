import { Router, type Response } from 'express';
import { type Kysely } from 'kysely';
import zod from 'zod';

import createAdminCertificateSettingsRouter from './certificateSettings.ts';
import createAdminCrisesRouter from './crises.ts';
import {
  type AdminLoginResponse,
  type AdminMeResponse,
  type AdminOrganizationRequestReviewResponse,
  type AdminOrganizationRequestsResponse,
} from './index.types.ts';
import authorizeOnly from '../../../auth/authorizeOnly.ts';
import removePassword from '../../../auth/removePassword.ts';
import createResetPassword from '../../../auth/resetPassword.ts';
import executeTransaction from '../../../db/executeTransaction.ts';
import { type Database } from '../../../db/tables/index.ts';
import { compare, hash } from '../../../services/bcrypt/index.ts';
import { recomputeOrganizationVector } from '../../../services/embeddings/updates.ts';
import { generateJWT } from '../../../services/jwt/index.ts';
import { sendOrganizationAcceptanceEmail, sendOrganizationRejectionEmail } from '../../../services/smtp/emails.ts';
import { loginInfoSchema } from '../../../types.ts';
import { parseListQuery } from '../utils/listQuery.ts';

const organizationPrivateResponseColumns = [
  'id',
  'name',
  'email',
  'phone_number',
  'url',
  'latitude',
  'longitude',
  'location_name',
] as const;

function createAdminRouter(db: Kysely<Database>) {
  const adminRouter = Router();

  adminRouter.post('/login', async (req, res: Response<AdminLoginResponse>) => {
    const body = loginInfoSchema.parse(req.body);

    const account = await db
      .selectFrom('admin_account')
      .selectAll()
      .where('admin_account.email', '=', body.email)
      .executeTakeFirst();

    if (!account) {
      res.status(403);
      throw new Error('Invalid email or password');
    }

    const match = await compare(body.password, account.password);

    if (!match) {
      res.status(403);
      throw new Error('Invalid email or password');
    }

    const token = await generateJWT({
      id: account.id,
      role: 'admin',
      token_version: account.token_version,
    });

    res.json({
      token,
      admin: removePassword(account),
    });
  });

  adminRouter.use(authorizeOnly('admin'));

  adminRouter.get('/me', async (req, res: Response<AdminMeResponse>) => {
    const admin = await db
      .selectFrom('admin_account')
      .selectAll()
      .where('id', '=', req.userJWT!.id)
      .executeTakeFirstOrThrow();

    res.json({ admin: removePassword(admin) });
  });

  adminRouter.get('/getOrganizationRequests', async (req, res: Response<AdminOrganizationRequestsResponse>) => {
    const { search, sortBy, sortDir } = parseListQuery(req.query, {
      allowedSortBy: ['created_at', 'name', 'email'],
      defaultSortBy: 'created_at',
    });

    let organizationRequestsQuery = db
      .selectFrom('organization_request')
      .selectAll();

    if (search) {
      const searchPattern = `%${search};%`;
      organizationRequestsQuery = organizationRequestsQuery.where(eb => eb.or([
        eb('organization_request.name', 'ilike', searchPattern),
        eb('organization_request.email', 'ilike', searchPattern),
        eb('organization_request.location_name', 'ilike', searchPattern),
      ]));
    }

    switch (sortBy) {
      case 'name':
      case 'email':
        organizationRequestsQuery = organizationRequestsQuery.orderBy('organization_request.name', sortDir);
        break;
      case 'created_at':
      default:
        organizationRequestsQuery = organizationRequestsQuery.orderBy('organization_request.created_at', sortDir);
        break;
    }

    const organizationRequests = await organizationRequestsQuery.execute();

    res.json({ organizationRequests });
  });

  adminRouter.post('/reviewOrganizationRequest', async (req, res: Response<AdminOrganizationRequestReviewResponse>, next) => {
    const { requestId, accepted, reason } = zod.object({
      requestId: zod.number(),
      accepted: zod.boolean(),
      reason: zod.string().nullable(),
    }).parse(req.body);

    const organizationRequest = await db
      .selectFrom('organization_request')
      .selectAll()
      .where('id', '=', requestId)
      .executeTakeFirst();

    if (!organizationRequest) {
      res.status(404);
      next(new Error('Organization request with id ' + requestId + ' not found.'));
      return;
    }

    if (!accepted) {
      await sendOrganizationRejectionEmail(organizationRequest, reason);
      await db
        .deleteFrom('organization_request')
        .where('id', '=', requestId)
        .execute();
      res.json({});
      return;
    }

    const password = Math.random().toString(36).slice(-8);

    const insertedOrganization = await executeTransaction(db, async (trx) => {
      await trx
        .deleteFrom('organization_request')
        .where('id', '=', requestId)
        .execute();

      return await trx
        .insertInto('organization_account')
        .values({
          name: organizationRequest.name,
          email: organizationRequest.email,
          phone_number: organizationRequest.phone_number,
          url: organizationRequest.url,
          latitude: Number(organizationRequest.latitude),
          longitude: Number(organizationRequest.longitude),
          location_name: organizationRequest.location_name,
          password: await hash(password),
        })
        .returning(organizationPrivateResponseColumns)
        .executeTakeFirst();
    });

    if (!insertedOrganization) {
      res.status(500);
      throw new Error('Failed to create organization account');
    }

    await recomputeOrganizationVector(insertedOrganization.id, db);

    await sendOrganizationAcceptanceEmail(organizationRequest, password);

    res.json({
      organization: insertedOrganization,
    });
  });

  adminRouter.post('/reset-password', createResetPassword(db));

  adminRouter.use('/crises', createAdminCrisesRouter(db));
  adminRouter.use('/certificate-settings', createAdminCertificateSettingsRouter(db));

  return adminRouter;
}

export default createAdminRouter;
