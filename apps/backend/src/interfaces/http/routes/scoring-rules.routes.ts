// ── Scoring Rules Routes ──
// PostgreSQL-backed CRUD for signal scoring rule definitions.
// User-scoped: each user manages their own rules.

import { Router } from 'express';
import { prisma } from '../../../shared/prisma';
import { permission } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';
import { detectLang, t } from '../../../shared/i18n';
import { AuthenticatedUser } from '../../../types/authenticated-user.interface';

// using shared prisma singleton

const CreateRuleSchema = z.object({
  name: z.string().min(1).max(100),
  weights: z.record(z.string(), z.number()),
  threshold: z.number().min(0).max(100),
  action: z.enum(['BUY', 'SELL', 'ALERT', 'IGNORE']),
});

const UpdateRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['Active', 'Draft']).optional(),
  enabled: z.boolean().optional(),
  weights: z.record(z.string(), z.number()).optional(),
  threshold: z.number().min(0).max(100).optional(),
  action: z.enum(['BUY', 'SELL', 'ALERT', 'IGNORE']).optional(),
});

export function createScoringRulesRoutes(): Router {
  const router = Router();

  router.get('/', permission(['scoring:manage']), async (req, res, next) => {
    try {
      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      const rules = await prisma.scoringRule.findMany({
        where: { userId: user.userId },
        orderBy: { updatedAt: 'desc' },
      });

      res.json({ success: true, data: rules, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  router.post('/', permission(['scoring:manage']), validate(CreateRuleSchema), async (req, res, next) => {
    try {
      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      const { name, weights, threshold, action } = req.body as z.infer<typeof CreateRuleSchema>;

      const rule = await prisma.scoringRule.create({
        data: {
          userId: user.userId,
          name,
          status: 'Active',
          version: 1,
          weights,
          threshold,
          action,
          enabled: true,
          versions: [],
        },
      });

      res.status(201).json({ success: true, data: rule, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  router.put('/:id', permission(['scoring:manage']), validate(UpdateRuleSchema), async (req, res, next) => {
    try {
      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      const existing = await prisma.scoringRule.findFirst({
        where: { id: String(req.params.id), userId: user.userId },
      });
      if (!existing) {
        const lang = detectLang(req);
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('rule.not_found', lang) }, timestamp: new Date().toISOString() });
        return;
      }

      const body = req.body as z.infer<typeof UpdateRuleSchema>;

      const rule = await prisma.scoringRule.update({
        where: { id: existing.id },
        data: {
          name: body.name ?? existing.name,
          status: body.status ?? existing.status,
          enabled: body.enabled ?? existing.enabled,
          weights: body.weights ?? existing.weights,
          threshold: body.threshold ?? existing.threshold,
          action: body.action ?? existing.action,
        },
      });

      res.json({ success: true, data: rule, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  router.delete('/:id', permission(['scoring:manage']), async (req, res, next) => {
    try {
      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      const existing = await prisma.scoringRule.findFirst({
        where: { id: String(req.params.id), userId: user.userId },
      });
      if (!existing) {
        const lang = detectLang(req);
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('rule.not_found', lang) }, timestamp: new Date().toISOString() });
        return;
      }

      await prisma.scoringRule.delete({ where: { id: existing.id } });
      res.json({ success: true, data: { deleted: true }, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  return router;
}
