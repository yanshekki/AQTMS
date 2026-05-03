// ── Permission Middleware (Route-Level RBAC) ──
// Checks permissions BEFORE controller execution.
// Usage: router.post('/trade', permission(['trade:execute:binance']), controller.execute)

import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors';

export interface AuthenticatedUser {
  userId: string;
  walletAddress: string;
  role: string;
  permissions: string[];
}

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function permission(requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Authentication check
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Permission check — user must have ALL required permissions
    const userPermissions = req.user.permissions ?? [];
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter((p) => !userPermissions.includes(p));
      throw new ForbiddenError(
        `Missing required permissions: ${missing.join(', ')}`,
        [{ required: requiredPermissions, granted: userPermissions }],
      );
    }

    next();
  };
}

// Convenience: permission with wildcard support
export function permissionAny(requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userPermissions = req.user.permissions ?? [];
    const hasAnyPermission = requiredPermissions.some((perm) => {
      if (perm.endsWith('*')) {
        const prefix = perm.slice(0, -1);
        return userPermissions.some((up) => up.startsWith(prefix));
      }
      return userPermissions.includes(perm);
    });

    if (!hasAnyPermission) {
      throw new ForbiddenError(
        `Missing required permissions (any of): ${requiredPermissions.join(', ')}`,
      );
    }

    next();
  };
}
