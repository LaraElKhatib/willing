import { Router } from 'express';
import { setUserJWT } from './authorization.js';
import adminRouter from './routes/admin/index.js';
import userRouter from './routes/user.js';

const api = Router();
api.use(setUserJWT);

api.use('/user', userRouter);
api.use('/admin', adminRouter);

export default api;
