// ── Rate Limiting Middleware ──
// Per-IP + per-user rate limiting using Redis.
// Supports i18n via Accept-Language header.

import type { Request, Response, NextFunction } from 'express';
import redis from '../../../shared/redis';
import { detectLang, t } from '../../../shared/i18n';
import { AuthenticatedUser } from '../../../types/authenticated-user.interface';

const WINDOW_SEC = 60;
const MAX_REQUESTS_PER_IP = 100;
const MAX_REQUESTS_PER_USER = 300;
const AUTH_RATE_LIMIT = 10;
const HEAVY_RATE_LIMIT = 30; // For trade/large payloads

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const ipKey = `ratelimit:ip:${ip}`;

    // IP-based rate limit
    const ipCount = await redis.incr(ipKey);
    if (ipCount === 1) await redis.expire(ipKey, WINDOW_SEC);
    if (ipCount > MAX_REQUESTS_PER_IP) {
      const lang = detectLang(req);
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: t('rate_limit.too_many_requests', lang) },
        retryAfter: WINDOW_SEC,
      });
      return;
    }

    // User-based rate limit (if authenticated)
    const user = req.user as AuthenticatedUser | undefined;
    if (user?.userId) {
      const userKey = `ratelimit:user:${user.userId}`;
      const userCount = await redis.incr(userKey);
      if (userCount === 1) await redis.expire(userKey, WINDOW_SEC);
      if (userCount > MAX_REQUESTS_PER_USER) {
        const lang = detectLang(req);
        res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMITED', message: t('rate_limit.user_limit', lang) },
          retryAfter: WINDOW_SEC,
        });
        return;
      }
    }

    next();
  } catch {
    // Redis failed — allow request through
    next();
  }
}

export async function strictRateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as AuthenticatedUser | undefined;
    const key = user?.userId
      ? `ratelimit:strict:${user.userId}`
      : `ratelimit:strict:${req.ip ?? 'unknown'}`;

    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SEC);
    if (count > HEAVY_RATE_LIMIT) {
      const lang = detectLang(req);
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: t('rate_limit.action_limit', lang) },
        retryAfter: WINDOW_SEC,
      });
      return;
    }
    next();
  } catch {
    next();
  }
}

// Special rate limit for auth endpoints
export async function authRateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `ratelimit:auth:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    if (count > AUTH_RATE_LIMIT) {
      const lang = detectLang(req);
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: t('rate_limit.auth_attempts', lang) },
        retryAfter: 60,
      });
      return;
    }
    next();
  } catch { next(); }
}
