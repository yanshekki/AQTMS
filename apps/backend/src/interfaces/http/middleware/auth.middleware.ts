// ── Auth Middleware ──
// Extracts JWT from Authorization header, verifies, and attaches user to request.
// Includes token invalidation check via Redis.

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../../shared/config';
import redis from '../../../shared/redis';
import { logger } from '../../../shared/logger';

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
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

    // Check token invalidation (e.g. role changed after token was issued)
    try {
      const invalidBefore = await redis.get(`token:invalid_before:${decoded.userId}`);
      if (invalidBefore) {
        const invalidTimestamp = parseInt(invalidBefore, 10);
        if (decoded.iat < invalidTimestamp) {
          logger.warn({ userId: decoded.userId, tokenIat: decoded.iat, invalidBefore: invalidTimestamp }, 'Token invalidated — all tokens before this time are revoked');
          return next(); // Let permission middleware handle the missing user
        }
      }
    } catch {
      // Redis unavailable — allow request through (fail open for availability, permission middleware is the defense)
      logger.warn('Redis unavailable during token invalidation check — allowing request');
    }

    req.user = {
      userId: decoded.userId,
      walletAddress: decoded.walletAddress,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    next();
  } catch (err) {
    // Invalid/expired/forged token — log and let permission middleware handle it
    logger.warn({ err, tokenPreview: token.slice(0, 10) + '...' }, 'Invalid JWT token rejected');
    next();
  }
}
