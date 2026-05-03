// ── Scoring Rules Routes ──
// In-memory CRUD for signal scoring rule definitions (Map-based for concurrent safety).

import { Router } from 'express';
import { permission } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';

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

const UpdateRuleSchema = CreateRuleSchema.partial();

export function createScoringRulesRoutes(): Router {
  const router = Router();

  // In-memory store (Map avoids index-shifting bugs during concurrent mutations)
  const rules = new Map<string, any>([
    ['1', {
      id: '1', name: 'High Signal Strategy', status: 'Active', version: 'v3',
      weights: { truth: 35, sentiment: 15, relevance: 40, confidence: 10 },
      threshold: 80, action: 'BUY',
      versions: [
        { version: 'v3', timestamp: new Date().toISOString(), weights: { truth: 35, sentiment: 15, relevance: 40, confidence: 10 }, action: 'BUY', by: 'admin' },
        { version: 'v2', timestamp: new Date(Date.now() - 86400000).toISOString(), weights: { truth: 30, sentiment: 20, relevance: 35, confidence: 15 }, action: 'ALERT', by: 'admin' },
        { version: 'v1', timestamp: new Date(Date.now() - 172800000).toISOString(), weights: { truth: 25, sentiment: 25, relevance: 25, confidence: 25 }, action: 'ALERT', by: 'system' },
      ],
    }],
    ['2', {
      id: '2', name: 'Conservative Filter', status: 'Active', version: 'v1',
      weights: { truth: 40, sentiment: 10, relevance: 40, confidence: 10 },
      threshold: 90, action: 'ALERT',
      versions: [{ version: 'v1', timestamp: new Date().toISOString(), weights: { truth: 40, sentiment: 10, relevance: 40, confidence: 10 }, action: 'ALERT', by: 'admin' }],
    }],
    ['3', {
      id: '3', name: 'Momentum Strategy', status: 'Draft', version: 'v2',
      weights: { truth: 20, sentiment: 30, relevance: 25, confidence: 25 },
      threshold: 75, action: 'SELL',
      versions: [
        { version: 'v2', timestamp: new Date().toISOString(), weights: { truth: 20, sentiment: 30, relevance: 25, confidence: 25 }, action: 'SELL', by: 'analyst' },
        { version: 'v1', timestamp: new Date(Date.now() - 86400000).toISOString(), weights: { truth: 25, sentiment: 25, relevance: 25, confidence: 25 }, action: 'BUY', by: 'analyst' },
      ],
    }],
  ]);

  router.get('/', permission(['scoring:manage']), async (_req, res) => {
    const data = [...rules.values()];
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  });

  router.post('/', permission(['scoring:manage']), validate(CreateRuleSchema), async (req, res) => {
    const { name, weights, threshold, action } = req.body as z.infer<typeof CreateRuleSchema>;
    const id = String(rules.size + 1);
    const newRule = {
      id, name, status: 'Active', version: 'v1', weights, threshold, action,
      versions: [{ version: 'v1', timestamp: new Date().toISOString(), weights, action, by: 'user' }],
    };
    rules.set(id, newRule);
    res.status(201).json({ success: true, data: newRule, timestamp: new Date().toISOString() });
  });

  router.put('/:id', permission(['scoring:manage']), validate(UpdateRuleSchema), async (req, res) => {
    const rule = rules.get(String(req.params.id));
    if (!rule) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' }, timestamp: new Date().toISOString() });
      return;
    }
    const body = req.body as any;
    if (body.weights) rule.weights = { ...rule.weights, ...body.weights };
    if (body.threshold !== undefined) rule.threshold = body.threshold;
    if (body.action) rule.action = body.action;
    if (body.name) rule.name = body.name;
    if (body.status) rule.status = body.status;
    rule.version = `v${rule.versions.length + 1}`;
    rule.versions.unshift({
      version: rule.version,
      timestamp: new Date().toISOString(),
      weights: { ...rule.weights },
      action: rule.action,
      by: 'user',
    });
    res.json({ success: true, data: rule, timestamp: new Date().toISOString() });
  });

  router.delete('/:id', permission(['scoring:manage']), async (req, res) => {
    if (!rules.delete(String(req.params.id))) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' }, timestamp: new Date().toISOString() });
      return;
    }
    res.json({ success: true, data: { deleted: true }, timestamp: new Date().toISOString() });
  });

  return router;
}
