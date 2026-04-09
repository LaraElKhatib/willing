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

export const createProfileEmbeddingRateLimit = () => rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: request =>
    request.userJWT
      ? `user:${request.userJWT.role}:${request.userJWT.id}`
      : `ip:${ipKeyGenerator(request.ip ?? '127.0.0.1')}`,
  message: {
    message: 'Too many profile vector recompute requests. Please try again in a few minutes.',
  },
});
