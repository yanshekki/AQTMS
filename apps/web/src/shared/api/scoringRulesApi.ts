// ── Scoring Rules API Client (Zod-guarded, zero any types) ──

import { z } from 'zod';
import { safeGet, safePost, safePut, safeDelete } from './axiosInstance';

const WeightsSchema = z.object({
  truth: z.number().min(0).max(100),
  sentiment: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
});

const CreateRuleSchema = z.object({
  name: z.string().min(1).max(100),
  weights: WeightsSchema,
  threshold: z.number().min(0).max(100),
  action: z.enum(['BUY', 'SELL', 'ALERT', 'IGNORE']),
});

const UpdateRuleSchema = CreateRuleSchema.partial();

export type CreateRuleInput = z.infer<typeof CreateRuleSchema>;
export type UpdateRuleInput = z.infer<typeof UpdateRuleSchema>;

const RuleSchema = z.object({
  id: z.string(), name: z.string(), status: z.string(), version: z.string(),
  enabled: z.boolean().default(true),
  weights: z.object({ truth: z.number(), sentiment: z.number(), relevance: z.number(), confidence: z.number() }),
  threshold: z.number(), action: z.enum(['BUY', 'SELL', 'ALERT', 'IGNORE']),
  history: z.array(z.object({
    version: z.string(), timestamp: z.string(),
    weights: z.object({ truth: z.number(), sentiment: z.number(), relevance: z.number(), confidence: z.number() }),
    action: z.string(), by: z.string(),
  })),
});

const RulesListResponseSchema = z.object({ success: z.literal(true), data: z.array(RuleSchema), timestamp: z.string() });
const RuleResponseSchema = z.object({ success: z.literal(true), data: RuleSchema, timestamp: z.string() });
const DeleteResponseSchema = z.object({ success: z.literal(true), data: z.object({ deleted: z.boolean() }), timestamp: z.string() });

export const scoringRulesApi = {
  getRules: () => safeGet('/api/v1/scoring-rules', RulesListResponseSchema),
  createRule: (data: CreateRuleInput) =>
    safePost('/api/v1/scoring-rules', CreateRuleSchema.parse(data), RuleResponseSchema),
  updateRule: (id: string, data: UpdateRuleInput) =>
    safePut(`/api/v1/scoring-rules/${id}`, UpdateRuleSchema.parse(data), RuleResponseSchema),
  toggleRule: (id: string, enabled: boolean) =>
    safePut(`/api/v1/scoring-rules/${id}`, { enabled }, RuleResponseSchema),
  deleteRule: (id: string) => safeDelete(`/api/v1/scoring-rules/${id}`, {}, DeleteResponseSchema),
};
