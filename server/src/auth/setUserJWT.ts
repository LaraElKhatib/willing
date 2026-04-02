import { type Kysely } from 'kysely';

import { verifyJWT } from '../services/jwt/index.ts';

import type { Database } from '../db/tables/index.ts';
import type { RequestHandler } from 'express';

const createSetUserJWT = (db: Kysely<Database>) => {
  const setUserJWT: RequestHandler = async (req, _res, next) => {
    if (!req.headers.authorization) {
      next();
      return;
    }

    const token = req.headers.authorization!.split(' ')[1];
    if (!token) {
      next();
      return;
    }

    try {
      const payload = await verifyJWT(token);

      const accountTable = {
        admin: 'admin_account',
        organization: 'organization_account',
        volunteer: 'volunteer_account',
      }[payload.role] as 'admin_account' | 'organization_account' | 'volunteer_account';

      const row = await db
        .selectFrom(accountTable)
        .select('token_version')
        .where('id', '=', payload.id)
        .executeTakeFirst();

      const rowTokenVersion = row ? Number(row.token_version) : undefined;

      if (row && rowTokenVersion === payload.token_version) {
        req.userJWT = payload;
      } else {
        _res.setHeader('x-jwt-status', 'invalid');
      }
    } catch {
      _res.setHeader('x-jwt-status', 'invalid');
    }

    next();
  };

  return setUserJWT;
};

export default createSetUserJWT;
