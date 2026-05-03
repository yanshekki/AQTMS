// ── Signals API (Zod-validated) ──

import { z } from 'zod';
import { safeGet } from '@/shared/api';
import { AISignalSchema, SignalDetailSchema, type SignalFilters } from '../lib/types';

const SignalsListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(AISignalSchema),
  timestamp: z.string(),
});

const SignalDetailResponseSchema = z.object({
  success: z.literal(true),
  data: SignalDetailSchema,
  timestamp: z.string(),
});

export const signalsApi = {
  async getRecentSignals(filters: SignalFilters = {}) {
    const params = new URLSearchParams();
    if (filters.source) params.set('source', filters.source);
    if (filters.minScore !== undefined) params.set('minScore', filters.minScore.toString());
    if (filters.limit) params.set('limit', filters.limit.toString());
    params.set('limit', (filters.limit ?? 50).toString());

    return safeGet(`/api/v1/news/recent?${params.toString()}`, SignalsListResponseSchema);
  },

  async getSignalDetail(id: string) {
    return safeGet(`/api/v1/news/${id}`, SignalDetailResponseSchema);
  },
};
