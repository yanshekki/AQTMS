// ── AI Signals Types ──

import { z } from 'zod';

export const AISignalSchema = z.object({
  id: z.string(),
  source: z.enum(['TELEGRAM', 'X', 'ONCHAIN']),
  channelName: z.string().nullable(),
  content: z.string(),
  truthScore: z.number().nullable(),
  sentimentScore: z.number().nullable(),
  relevanceScore: z.number().nullable(),
  compositeScore: z.number().nullable(),
  isFake: z.boolean().nullable(),
  processedAt: z.string().nullable(),
  aiAnalysis: z.string().nullable(), // JSON string
});

export type AISignal = z.infer<typeof AISignalSchema>;

export const SignalDetailSchema = AISignalSchema.extend({
  aiAnalysis: z.string(),
  aiResponses: z.array(z.object({
    provider: z.string(),
    task: z.string(),
    result: z.object({
      truthScore: z.number().optional(),
      sentimentScore: z.number().optional(),
      relevanceScore: z.number().optional(),
      confidenceScore: z.number().optional(),
      reasoning: z.string().optional(),
      affectedAssets: z.array(z.string()).optional(),
      suggestedAction: z.string().optional(),
      urgency: z.string().optional(),
    }),
  })).optional(),
});

export type SignalDetail = z.infer<typeof SignalDetailSchema>;

export interface SignalFilters {
  source?: string | undefined;
  minScore?: number;
  maxScore?: number;
  asset?: string | undefined;
  limit?: number;
}

export const AI_PROVIDER_COLORS: Record<string, string> = {
  'GROK': '#1DA1F2',
  'GEMINI': '#4285F4',
  'DEEPSEEK': '#4F6EF7',
  'OPENAI': '#10A37F',
  'OLLAMA': '#FF6B35',
};
