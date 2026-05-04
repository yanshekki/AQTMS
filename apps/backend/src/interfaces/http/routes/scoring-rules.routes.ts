// ── Scoring Rules Routes ──
// PostgreSQL-backed CRUD for signal scoring rule definitions.
// User-scoped: each user manages their own rules.

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { permission } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';
import { detectLang, t } from '../../../shared/i18n';

const prisma = new PrismaClient();

const CreateRuleSchema = z.object({
  name: z.string().min(1).max(100),
  weights: z.object({
    truth: z.number().min(0).max(100),
    sentiment: z.number().min(0).max(100),
    relevance: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
  }),
  threshold: z.number().min(0).max(100),
  action: z.enum(['BUY', 'SELL', 'ALERT', 'IGNORE']),
});

const UpdateRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['Active', 'Draft']).optional(),
  enabled: z.boolean().optional(),
  weights: z.object({
    truth: z.number().min(0).max(100),
    sentiment: z.number().min(0).max(100),
    relevance: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
  }).optional(),
  threshold: z.number().min(0).max(100).optional(),
  action: z.enum(['BUY', 'SELL', 'ALERT', 'IGNORE']).optional(),
});

export function createScoringRulesRoutes(): Router {
  const router = Router();

  // GET / — list scoring rules (user-scoped)
  router.get('/', permission(['scoring:manage']), async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      const rules = await prisma.scoringRule.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });

      const data = rules.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        version: r.version,
        enabled: r.enabled,
        weights: JSON.parse(r.weights) as Record<string, number>,
        threshold: r.threshold,
        action: r.action,
        history: JSON.parse(r.versions) as unknown[],
      }));

      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  // POST / — create new scoring rule
  router.post('/', permission(['scoring:manage']), validate(CreateRuleSchema), async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      const { name, weights, threshold, action } = req.body as z.infer<typeof CreateRuleSchema>;
      const versionHistory = [{ version: 'v1', timestamp: new Date().toISOString(), weights, action, by: 'user' }];

      const rule = await prisma.scoringRule.create({
        data: {
          userId,
          name,
          status: 'Active',
          version: 'v1',
          weights: JSON.stringify(weights),
          threshold,
          action,
          enabled: true,
          versions: JSON.stringify(versionHistory),
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: rule.id,
          name: rule.name,
          status: rule.status,
          version: rule.version,
          enabled: rule.enabled,
          weights,
          threshold: rule.threshold,
          action: rule.action,
          history: versionHistory,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) { next(err); }
  });

  // PUT /:id — update scoring rule
  router.put('/:id', permission(['scoring:manage']), validate(UpdateRuleSchema), async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      const existing = await prisma.scoringRule.findFirst({
        where: { id: String(req.params.id), userId },
      });
      if (!existing) {
        const lang = detectLang(req);
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('rule.not_found', lang) }, timestamp: new Date().toISOString() });
        return;
      }

      const body = req.body as z.infer<typeof UpdateRuleSchema>;
      const currentWeights = JSON.parse(existing.weights) as Record<string, number>;
      const newWeights = body.weights ? { ...currentWeights, ...body.weights } : currentWeights;
      const newAction = body.action ?? existing.action;
      const newThreshold = body.threshold ?? existing.threshold;

      const versionHistory = JSON.parse(existing.versions) as unknown[];
      const newVersion = `v${versionHistory.length + 1}`;
      versionHistory.unshift({
        version: newVersion,
        timestamp: new Date().toISOString(),
        weights: newWeights,
        action: newAction,
        by: 'user',
      });

      const rule = await prisma.scoringRule.update({
        where: { id: existing.id },
        data: {
          name: body.name ?? existing.name,
          status: body.status ?? existing.status,
          enabled: body.enabled ?? existing.enabled,
          version: newVersion,
          weights: JSON.stringify(newWeights),
          threshold: newThreshold,
          action: newAction,
          versions: JSON.stringify(versionHistory),
        },
      });

      res.json({
        success: true,
        data: {
          id: rule.id,
          name: rule.name,
          status: rule.status,
          version: rule.version,
          enabled: rule.enabled,
          weights: newWeights,
          threshold: rule.threshold,
          action: rule.action,
          history: versionHistory,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) { next(err); }
  });

  // DELETE /:id — delete scoring rule
  router.delete('/:id', permission(['scoring:manage']), async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      const existing = await prisma.scoringRule.findFirst({
        where: { id: String(req.params.id), userId },
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
