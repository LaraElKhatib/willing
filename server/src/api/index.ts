import { Router } from 'express';

import { setUserJWT } from './authorization.ts';
import adminRouter from './routes/admin/index.ts';
import geocodingRouter from './routes/geocoding.ts';
import organizationRouter from './routes/organization/index.ts';
import publicRouter from './routes/public.ts';
import userRouter from './routes/user.ts';
import volunteerRouter from './routes/volunteer/index.ts';

const api = Router();
api.use(setUserJWT);

api.use('/user', userRouter);
api.use('/public', publicRouter);
api.use('/admin', adminRouter);
api.use('/volunteer', volunteerRouter);
api.use('/organization', organizationRouter);

api.use('/geocoding', geocodingRouter);

export default api;
