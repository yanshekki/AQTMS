// ── Notifications Routes ──
// PostgreSQL-backed notification center with user scoping.

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { permission } from '../middleware/permission.middleware';
import { detectLang, t } from '../../../shared/i18n';

const prisma = new PrismaClient();

export function createNotificationsRoutes(): Router {
  const router = Router();

  // GET / — list notifications (user-scoped, newest first)
  router.get('/', permission(['user:read']), async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      // Seed system notifications for new users (idempotent)
      await seedSystemNotifications(userId);

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Map to frontend-compatible format (time = createdAt)
      const data = notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        time: n.createdAt.toISOString(),
        read: n.read,
        targetRoute: n.targetRoute,
      }));

      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  // PUT /:id/read — mark single notification as read
  router.put('/:id/read', permission(['user:read']), async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      const notification = await prisma.notification.findFirst({
        where: { id: String(req.params.id), userId },
      });
      if (!notification) {
        const lang = detectLang(req);
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('notification.not_found', lang) }, timestamp: new Date().toISOString() });
        return;
      }

      const updated = await prisma.notification.update({
        where: { id: notification.id },
        data: { read: true },
      });

      res.json({
        success: true,
        data: {
          id: updated.id,
          type: updated.type,
          title: updated.title,
          message: updated.message,
          time: updated.createdAt.toISOString(),
          read: updated.read,
          targetRoute: updated.targetRoute,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) { next(err); }
  });

  // PUT /read-all — mark all notifications as read
  router.put('/read-all', permission(['user:read']), async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });

      res.json({ success: true, data: { allRead: true }, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  return router;
}

// ── System Notification Seeder ──
// Seeds a set of initial notifications for new users. Idempotent.
async function seedSystemNotifications(userId: string): Promise<void> {
  const existingCount = await prisma.notification.count({ where: { userId } });
  if (existingCount > 0) return; // Already seeded

  const now = Date.now();
  const seedNotifications = [
    { userId, type: 'system', title: 'Welcome to AQTMS', message: 'Your automated trading system is ready. Connect an exchange to get started.', read: false, targetRoute: '/exchanges', createdAt: new Date(now) },
    { userId, type: 'system', title: 'Setup Guide', message: 'Configure your AI scoring rules and connect data sources to enable automated trading.', read: false, targetRoute: '/scoring-rules', createdAt: new Date(now - 60_000) },
    { userId, type: 'system', title: 'Security Tip', message: 'Your exchange API keys are encrypted at rest using AES-256-GCM. Never share your wallet private key.', read: false, targetRoute: '/settings', createdAt: new Date(now - 120_000) },
  ];

  await prisma.notification.createMany({ data: seedNotifications });
}
