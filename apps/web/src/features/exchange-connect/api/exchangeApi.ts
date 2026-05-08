// ── Exchange API Client (Zod-guarded) ──

import { z } from 'zod';
import { safePost, safeGet, safeDelete } from '@/shared/api';
import type { ExchangeAccount } from '../lib/schemas';
import { ConnectExchangeSchema, ExchangeAccountResponseSchema } from '../lib/schemas';

const ExchangeBalanceResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    exchange: z.string(),
    balances: z.array(z.object({ asset: z.string(), free: z.string(), locked: z.string() })),
    updatedAt: z.string(),
  }),
  timestamp: z.string(),
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
    const result = await safePost(`/api/v1/exchanges/${exchangeId}/test`, {},
      z.object({ success: z.literal(true), data: z.object({ connected: z.boolean(), status: z.string() }), timestamp: z.string() })
    );
    return result.data.connected;
  },

  async getBalances(exchangeId: string) {
    return safeGet(`/api/v1/exchanges/${exchangeId}/balance`, ExchangeBalanceResponseSchema);
  },

  // NEW: Delete / Disconnect exchange
  async deleteExchange(exchangeId: string): Promise<void> {
    await safeDelete(`/api/v1/exchanges/${exchangeId}`);
  },
};
