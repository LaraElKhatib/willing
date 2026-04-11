import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

export const createCertificateVerificationRateLimit = () => rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    valid: false,
    message: 'Too many verification attempts. Please try again later.',
  },
});

export const createGlobalRateLimit = () => rateLimit({
  windowMs: 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests. Please slow down and try again shortly.',
  },
});

export const createProfileUpdateRateLimit = () => rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: request =>
    request.userJWT
      ? `user:${request.userJWT.role}:${request.userJWT.id}`
      : `ip:${ipKeyGenerator(request.ip ?? '127.0.0.1')}`,
  message: {
    message: 'Too many profile update requests. Please try again in a few minutes.',
  },
});
