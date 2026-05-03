// ── Portfolio API Client (Zod-guarded) ──

import { z } from 'zod';
import { safeGet } from './axiosInstance';

const SummaryResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    totalValue: z.number(), todayPnL: z.number(), todayPnLPercent: z.number(),
    mtdReturn: z.number(), ytdReturn: z.number(),
    realizedPnL: z.number(), unrealizedPnL: z.number(),
  }),
  timestamp: z.string(),
});

const AllocationResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({ asset: z.string(), value: z.number(), allocation: z.number(), color: z.string() })),
  timestamp: z.string(),
});

const PerformanceResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({ date: z.string(), value: z.number() })),
  timestamp: z.string(),
});

const HoldingsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({ asset: z.string(), value: z.number(), allocation: z.number(), pnl: z.number(), pnlPercent: z.number() })),
  timestamp: z.string(),
});

export const portfolioApi = {
  getSummary: () => safeGet('/api/v1/portfolio/summary', SummaryResponseSchema),
  getAllocation: () => safeGet('/api/v1/portfolio/allocation', AllocationResponseSchema),
  getPerformance: (period: string = '30d') => safeGet(`/api/v1/portfolio/performance?period=${period}`, PerformanceResponseSchema),
  getHoldings: () => safeGet('/api/v1/portfolio/holdings', HoldingsResponseSchema),
};
