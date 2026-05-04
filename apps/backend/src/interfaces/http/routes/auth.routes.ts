// ── Auth Routes ──
// Wallet-based authentication: nonce challenge → signature verification → JWT

import { Router } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { validate } from '../middleware/validate.middleware';
import { UnauthorizedError, ForbiddenError, ValidationError } from '../../../shared/errors';
import { getEnv } from '../../../shared/config';
import redis from '../../../shared/redis';

const prisma = new PrismaClient();

// DTOs
const ChallengeRequestSchema = z.object({
  walletAddress: z.string().min(42).max(42).refine((v) => v.startsWith('0x'), 'Invalid wallet address'),
});

const AuthenticateRequestSchema = z.object({
  walletAddress: z.string().min(42).max(42),
  signature: z.string().min(1),
});

// Default permissions by role — exact match (aligned with frontend RBAC)
// Default permissions by role — exact match (aligned with frontend RBAC)
const VALID_PERMISSIONS = new Set([
  'trade:execute', 'trade:cancel', 'trade:read',
  'exchange:connect', 'exchange:read',
  'risk:view', 'risk:manage', 'scoring:manage',
  'ai:read', 'datasource:read',
  'audit:read', 'audit:export',
  'admin:user:manage', 'admin:system',
  'user:read',
  'backtest:run',
]);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'trade:execute', 'trade:cancel', 'trade:read',
    'exchange:connect', 'exchange:read',
    'risk:view', 'risk:manage', 'scoring:manage',
    'ai:read', 'datasource:read',
    'audit:read', 'audit:export',
    'admin:user:manage', 'admin:system',
    'user:read',
    'backtest:run',
  ],
  ADMIN: [
    'trade:execute', 'trade:cancel', 'trade:read',
    'exchange:connect', 'exchange:read',
    'risk:view', 'user:read',
    'audit:read', 'audit:export',
    'ai:read', 'datasource:read',
    'admin:user:manage', 'admin:system',
    'backtest:run', 'scoring:manage',
  ],
  TRADER: [
    'trade:execute', 'trade:cancel', 'trade:read',
    'exchange:connect', 'exchange:read',
    'risk:view', 'datasource:read',
    'user:read',
  ],
  ANALYST: [
    'trade:read', 'exchange:read',
    'ai:read', 'datasource:read',
    'audit:read', 'risk:view',
    'scoring:manage',
    'backtest:run',
    'user:read',
  ],
  VIEWER: ['trade:read', 'exchange:read', 'user:read'],
};

export function createAuthRoutes(): Router {
  const router = Router();

  // POST /auth/challenge — generate nonce for wallet
  router.post(
    '/challenge',
    validate(ChallengeRequestSchema),
    async (req, res, next) => {
      try {
        const { walletAddress } = req.body as z.infer<typeof ChallengeRequestSchema>;
        const normalizedAddress = walletAddress.toLowerCase();
        const nonce = randomBytes(32).toString('hex');

        // Upsert user with new nonce
        await prisma.user.upsert({
          where: { walletAddress: normalizedAddress },
          create: {
            walletAddress: normalizedAddress,
            nonce,
            role: 'VIEWER',
            permissions: JSON.stringify(ROLE_PERMISSIONS.VIEWER),
          },
          update: { nonce },
        });

        const message = `AQTMS Login\nWallet: ${normalizedAddress}\nNonce: ${nonce}`;

        res.json({
          success: true,
          data: { message },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /auth/authenticate — verify signature, return JWT
  router.post(
    '/authenticate',
    validate(AuthenticateRequestSchema),
    async (req, res, next) => {
      try {
        const { walletAddress, signature } = req.body as z.infer<typeof AuthenticateRequestSchema>;
        const normalizedAddress = walletAddress.toLowerCase();

        // Get user with nonce
        const user = await prisma.user.findUnique({
          where: { walletAddress: normalizedAddress },
        });

        if (!user) {
          throw new UnauthorizedError('User not found — request a challenge first');
        }

        // Reconstruct the signed message
        const message = `AQTMS Login\nWallet: ${normalizedAddress}\nNonce: ${user.nonce}`;

        // Verify signature (EIP-191 personal_sign)
        let recoveredAddress: string;
        try {
          recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
        } catch {
          throw new UnauthorizedError('Invalid signature format');
        }

        if (recoveredAddress !== normalizedAddress) {
          throw new UnauthorizedError('Signature verification failed — wrong wallet');
        }

        // Generate new nonce for next login
        const newNonce = randomBytes(32).toString('hex');
        await prisma.user.update({
          where: { id: user.id },
          data: { nonce: newNonce },
        });

        // Generate JWT
        let permissions: string[] = JSON.parse(user.permissions || '[]') as string[];
        // Validate permissions against known list — prevent privilege escalation via DB manipulation
        permissions = permissions.filter((p) => VALID_PERMISSIONS.has(p));
        if (permissions.length === 0) {
          // Fallback to role-based defaults if all permissions were invalid
          const rolePerms = (ROLE_PERMISSIONS as Record<string, string[]>)[user.role];
          if (rolePerms && rolePerms.length > 0) {
            permissions = rolePerms;
          } else {
            permissions = (ROLE_PERMISSIONS as Record<string, string[]>).VIEWER!;
          }
        }
        const env = getEnv();
        const token = jwt.sign(
          {
            userId: user.id,
            walletAddress: user.walletAddress,
            role: user.role,
            permissions,
          },
          env.JWT_SECRET,
          { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
        );

        // Log audit
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'user:login',
            resource: 'user',
            resourceId: user.id,
            ...(req.ip ? { ipAddress: req.ip } : {}),
          },
        });

        res.json({
          success: true,
          data: {
            token,
            user: {
              id: user.id,
              walletAddress: user.walletAddress,
              role: user.role,
              permissions,
            },
          },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /auth/me — get current user info from JWT
  router.get('/me', async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('No token provided');
      }

      const token = authHeader.split(' ')[1]!;
      const env = getEnv();
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: string;
        walletAddress: string;
        role: string;
        permissions: string[];
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, walletAddress: true, role: true, permissions: true, createdAt: true },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      res.json({
        success: true,
        data: {
          ...user,
          permissions: JSON.parse(user.permissions || '[]') as string[],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /auth/invalidate — invalidate all tokens for a user (admin use)
  router.post('/invalidate', async (req, res, next) => {
    try {
      // Verify admin permission from JWT
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authentication required');
      }
      const token = authHeader.split(' ')[1]!;
      const env = getEnv();
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: string; role: string; permissions: string[];
      };

      if (!decoded.permissions.includes('admin:user:manage')) {
        throw new ForbiddenError('Missing admin:user:manage permission');
      }

      const { userId } = req.body as { userId: string };
      if (!userId) throw new ValidationError('userId is required');

      // Set invalidation timestamp — all tokens issued before this time are revoked
      const invalidationTime = Math.floor(Date.now() / 1000);
      await redis.set(`token:invalid_before:${userId}`, invalidationTime);

      // Log audit
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.auditLog.create({
        data: {
          userId: decoded.userId,
          action: 'admin:token:invalidate',
          resource: 'user',
          resourceId: userId,
          ...(req.ip ? { ipAddress: req.ip } : {}),
        },
      });

      res.json({
        success: true,
        data: { invalidated: true, userId, invalidBefore: invalidationTime },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
