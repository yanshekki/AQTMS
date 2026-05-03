// ── Risk API Client (Zod-guarded) ──

import { z } from 'zod';
import { safePost } from './axiosInstance';

const PortfolioEntrySchema = z.object({
  asset: z.string(),
  quantity: z.number(),
  currentPrice: z.number(),
  historicalReturns: z.array(z.number()),
});

export type PortfolioEntry = z.infer<typeof PortfolioEntrySchema>;

const PositionSizeRequestSchema = z.object({
  accountSize: z.number(),
  riskPercent: z.number(),
  winRate: z.number().optional(),
  avgWin: z.number().optional(),
  avgLoss: z.number().optional(),
  stopLossDistance: z.number().optional(),
  delta: z.number().optional(),
  atr: z.number().optional(),
  currentPrice: z.number(),
});

export type PositionSizeRequest = z.infer<typeof PositionSizeRequestSchema>;

const RiskMetricsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    riskScore: z.number(),
    var95: z.number(), var99: z.number(), cvar95: z.number(),
    maxDrawdown: z.number(), currentDrawdown: z.number(),
    concentrationRisk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    concentration: z.array(z.object({ asset: z.string(), weight: z.number(), riskLevel: z.string() })),
    betaExposure: z.array(z.object({ asset: z.string(), betaVsBTC: z.number(), betaVsETH: z.number(), hedgeSuggestion: z.string().optional() })),
    correlationMatrix: z.array(z.object({ pair: z.string(), value: z.number() })),
    alerts: z.array(z.object({ rule: z.string(), status: z.enum(['WARNING', 'BREACHED']), message: z.string(), action: z.string() })),
  }),
  timestamp: z.string(),
});

export const riskApi = {
  async getMetrics(portfolio: PortfolioEntry[]) {
    return safePost('/api/v1/risk/metrics', { portfolio }, RiskMetricsResponseSchema);
  },

  async getPositionSize(data: PositionSizeRequest) {
    return safePost('/api/v1/risk/position-size', PositionSizeRequestSchema.parse(data), z.object({ success: z.literal(true), data: z.any(), timestamp: z.string() }));
  },
};
