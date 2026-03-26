import bcrypt from 'bcrypt';
import { Router, Response } from 'express';
import * as jose from 'jose';
import zod from 'zod';

import adminCrisesRouter from './crises.js';
import {
  AdminLoginResponse,
  AdminMeResponse,
  AdminOrganizationRequestReviewResponse,
  AdminOrganizationRequestsResponse,
} from './index.types.js';
import removePassword from '../../../auth/removePassword.js';
import resetPassword from '../../../auth/resetPassword.js';
import config from '../../../config.js';
import database from '../../../db/index.js';
import { recomputeOrganizationVector } from '../../../services/embeddings/updates.js';
import { sendOrganizationAcceptanceEmail, sendOrganizationRejectionEmail } from '../../../services/smtp/emails.js';
import { loginInfoSchema } from '../../../types.js';
import { authorizeOnly } from '../../authorization.js';
import { parseListQuery } from '../utils/listQuery.js';

const adminRouter = Router();
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

adminRouter.post('/login', async (req, res: Response<AdminLoginResponse>) => {
  const body = loginInfoSchema.parse(req.body);

  const account = await database
    .selectFrom('admin_account')
    .selectAll()
    .where('admin_account.email', '=', body.email)
    .executeTakeFirst();

  if (!account) {
    res.status(403);
    throw new Error('Invalid email or password');
  }

  const match = await bcrypt.compare(body.password, account.password);

  if (!match) {
    res.status(403);
    throw new Error('Invalid email or password');
  }
  const token = await new jose.SignJWT({
    id: account.id,
    role: 'admin',
  })
    .setIssuedAt()
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(config.JWT_SECRET));

  res.json({
    token,
    admin: removePassword(account),
  });
});

adminRouter.use(authorizeOnly('admin'));

adminRouter.get('/me', async (req, res: Response<AdminMeResponse>) => {
  const admin = await database
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

  let organizationRequestsQuery = database
    .selectFrom('organization_request')
    .selectAll();

  if (search) {
    const searchPattern = `%${search}%`;
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

  const organizationRequest = await database
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
    await database
      .deleteFrom('organization_request')
      .where('id', '=', requestId)
      .execute();
    res.json({});
    return;
  }

  const password = Math.random().toString(36).slice(-8);

  const insertedOrganization = await database.transaction().execute(async (trx) => {
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
        password: await bcrypt.hash(password, 10),
        is_disabled: false,
        is_deleted: false,
      })
      .returning(organizationPrivateResponseColumns)
      .executeTakeFirst();
  });

  if (!insertedOrganization) {
    res.status(500);
    throw new Error('Failed to create organization account');
  }

  await recomputeOrganizationVector(insertedOrganization.id);

  await sendOrganizationAcceptanceEmail(organizationRequest, password);

  res.json({
    organization: insertedOrganization,
  });
});

adminRouter.post('/reset-password', resetPassword);

adminRouter.use('/crises', adminCrisesRouter);

export default adminRouter;
