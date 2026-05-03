// ── Auth Middleware ──
// Extracts JWT from Authorization header, verifies, and attaches user to request.

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../../shared/config';

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
    };

    req.user = {
      userId: decoded.userId,
      walletAddress: decoded.walletAddress,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    next();
  } catch {
    // Invalid token — let the permission middleware handle it
    next();
  }
}
