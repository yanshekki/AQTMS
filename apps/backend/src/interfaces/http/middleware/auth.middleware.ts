// ── Auth Middleware ──
// Extracts JWT from Authorization header, verifies, and attaches user to request.
// Includes token invalidation check via Redis.

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../../shared/config';
import redis from '../../../shared/redis';
import { logger } from '../../../shared/logger';

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // Skip auth for public routes (health, auth endpoints)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      walletAddress: string;
      role: string;
      permissions: string[];
      iat: number;
    };

    // Set user immediately from decoded JWT (security: JWT signature already verified)
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      walletAddress: decoded.walletAddress,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    // Check token invalidation asynchronously — don't block the request
    // If the token was invalidated, future requests will be rejected (Redis is async here)
    redis.get(`token:invalid_before:${decoded.userId}`)
      .then((invalidBefore) => {
        if (invalidBefore) {
          const invalidTimestamp = parseInt(invalidBefore, 10);
          if (decoded.iat < invalidTimestamp) {
            logger.warn({ userId: decoded.userId, tokenIat: decoded.iat, invalidBefore: invalidTimestamp }, 'Token invalidated — but request already processed (async check)');
          }
        }
      })
      .catch(() => {
        // Redis unavailable — log and continue
        logger.warn('Redis unavailable during token invalidation check');
      });

    next();
  } catch (err) {
    // Invalid/expired/forged token — log and let permission middleware handle it
    logger.warn({ err, tokenPreview: token.slice(0, 10) + '...' }, 'Invalid JWT token rejected');
    next();
  }
}
