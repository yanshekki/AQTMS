// ── Trade API Client (Zod-guarded) ──

import { z } from 'zod';
import { safeGet } from './axiosInstance';

const TradeSchema = z.object({
  id: z.string(), exchangeOrderId: z.string().nullable(), exchange: z.string().optional(),
  symbol: z.string(), side: z.string(), type: z.string(), status: z.string(),
  quantity: z.number(), price: z.number().nullable(), filledQuantity: z.number().optional(),
  pnl: z.number().nullable().optional(), fee: z.number().nullable().optional(),
  feeCurrency: z.string().nullable().optional(), aiReason: z.string().nullable().optional(),
  riskScore: z.number().nullable().optional(), createdAt: z.string(),
});

const TradeListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    trades: z.array(TradeSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
  timestamp: z.string(),
});

const TradeDetailResponseSchema = z.object({
  success: z.literal(true),
  data: TradeSchema,
  timestamp: z.string(),
});

export interface TradeFilters {
  symbol?: string;
  side?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const tradeApi = {
  async getTrades(filters: TradeFilters = {}) {
    const params = new URLSearchParams();
    if (filters.symbol) params.set('symbol', filters.symbol);
    if (filters.side) params.set('side', filters.side);
    if (filters.status) params.set('status', filters.status);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    params.set('page', String(filters.page ?? 1));
    params.set('limit', String(filters.limit ?? 20));
    return safeGet(`/api/v1/trades?${params.toString()}`, TradeListResponseSchema);
  },

  async getTradeDetail(id: string) {
    return safeGet(`/api/v1/trades/${id}`, TradeDetailResponseSchema);
  },
};
