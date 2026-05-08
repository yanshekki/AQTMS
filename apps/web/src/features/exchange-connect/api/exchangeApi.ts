// ── Exchange API ──

import { z } from 'zod';
import { safeGet, safePost, safeDelete, safePatch } from '@/shared/api';
import { ConnectExchangeSchema, ExchangeAccountResponseSchema } from '../lib/schemas';
import type { ExchangeAccount } from '../lib/schemas';

// Schemas
const ExchangeBalanceResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    exchange: z.string(),
    balances: z.array(z.object({ asset: z.string(), free: z.string(), locked: z.string() })),
    updatedAt: z.string(),
  }),
  timestamp: z.string(),
});

const ExchangeAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  exchange: z.string(),
  name: z.string().optional(),
  status: z.string(),
  testPassed: z.boolean(),
  testnet: z.boolean(),
  isPaperTrading: z.boolean().optional(),
  createdAt: z.string(),
});

export const exchangeApi = {
  async getConnectedExchanges(): Promise<ExchangeAccount[]> {
    const response = await safeGet('/api/v1/exchanges', ExchangeAccountResponseSchema);
    return response.data;
  },

  async connectExchange(data: z.infer<typeof ConnectExchangeSchema>): Promise<ExchangeAccount> {
    const parsed = ConnectExchangeSchema.parse(data);
    const result = await safePost('/api/v1/exchanges/connect', parsed, ExchangeAccountResponseSchema);
    if (result.success && result.data.length > 0) {
      return result.data[0]!;
    }
    throw new Error('Failed to connect exchange');
  },

  async testConnection(exchangeId: string): Promise<boolean> {
    const result = await safePost(
      `/api/v1/exchanges/${exchangeId}/test`,
      {},
      z.object({
        success: z.literal(true),
        data: z.object({ connected: z.boolean(), status: z.string() }),
        timestamp: z.string(),
      }),
    );
    return result.data.connected;
  },

  async getBalances(exchangeId: string) {
    return safeGet(`/api/v1/exchanges/${exchangeId}/balance`, ExchangeBalanceResponseSchema);
  },

  async deleteExchange(exchangeId: string): Promise<void> {
    await safeDelete(`/api/v1/exchanges/${exchangeId}`);
  },

  // 新增：更新交易所帳戶設定（例如開啟/關閉 Paper Trading）
  async updateSettings(accountId: string, data: { isPaperTrading?: boolean }) {
    const response = await safePatch(
      `/api/v1/exchanges/${accountId}/settings`,
      data,
      z.object({
        success: z.literal(true),
        data: ExchangeAccountSchema,
        timestamp: z.string(),
      }),
    );
    return response.data;
  },
};
