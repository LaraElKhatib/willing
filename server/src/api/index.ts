import { Router } from 'express';

import setUserJWT from '../auth/setUserJWT.ts';
import createAdminRouter from './routes/admin/index.ts';
import createGeocodingRouter from './routes/geocoding.ts';
import createOrganizationRouter from './routes/organization/index.ts';
import createPublicRouter from './routes/public.ts';
import createUserRouter from './routes/user.ts';
import createVolunteerRouter from './routes/volunteer/index.ts';

import type { Database } from '../db/tables/index.ts';
import type { Kysely } from 'kysely';

function createAPIRouter(db: Kysely<Database>) {
  const api = Router();
  api.use(setUserJWT);

  api.use('/user', createUserRouter(db));
  api.use('/public', createPublicRouter(db));
  api.use('/admin', createAdminRouter(db));
  api.use('/volunteer', createVolunteerRouter(db));
  api.use('/organization', createOrganizationRouter(db));
  api.use('/geocoding', createGeocodingRouter(db));

  return api;
}

export default createAPIRouter;
