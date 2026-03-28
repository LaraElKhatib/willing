import { type JWTPayload } from 'jose';

import { type UserJWT } from '../types.ts';

type UserJWTPayload = JWTPayload & UserJWT;

declare global {
  namespace Express {
    export interface Request {
      userJWT?: UserJWT;
    }
  }
}
