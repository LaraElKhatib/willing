import { verifyJWT } from '../services/jwt/index.ts';

import type { RequestHandler } from 'express';

const setUserJWT = (async (req, _res, next) => {
  if (!req.headers.authorization) {
    next();
    return;
  };

  const token = req.headers.authorization!.split(' ')[1];
  if (!token) {
    next();
    return;
  }

  try {
    const payload = await verifyJWT(token);
    req.userJWT = payload;
  } catch {
    // If parsing the jwt failed, consider the user not logged in
  }

  next();
}) as RequestHandler;

export default setUserJWT;
