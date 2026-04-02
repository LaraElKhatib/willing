import { type RequestHandler } from 'express';

const authorizeOnly = (...roles: ('admin' | 'organization' | 'volunteer')[]) => {
  return ((req, res, next) => {
    if (!req.userJWT || !roles.includes(req.userJWT.role)) {
      res.status(403);
      next(new Error ('Unauthorized'));
    } else {
      next();
    }
  }) as RequestHandler;
};

export default authorizeOnly;
