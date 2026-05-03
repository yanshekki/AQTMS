// ── Exchange Connect Zod Schemas ──

import { z } from 'zod';

export const ConnectExchangeSchema = z.object({
  exchange: z.enum(['BINANCE', 'BYBIT']),
  apiKey: z.string().min(10, 'API Key must be at least 10 characters'),
  apiSecret: z.string().min(10, 'API Secret must be at least 10 characters'),
});

export type ConnectExchangeForm = z.infer<typeof ConnectExchangeSchema>;

export const ExchangeConnectionStatus = z.enum(['CONNECTED', 'DISCONNECTED', 'ERROR', 'TESTING']);

export const ExchangeAccountSchema = z.object({
  id: z.string(),
  exchange: z.enum(['BINANCE', 'BYBIT']),
  name: z.string(),
  status: ExchangeConnectionStatus,
  testPassed: z.boolean(),
  lastSyncAt: z.string().nullable(),
  balances: z.array(z.object({
    asset: z.string(),
    free: z.string(),
    locked: z.string(),
  })).optional(),
});

export const ExchangeAccountResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(ExchangeAccountSchema),
  timestamp: z.string(),
});

export type ExchangeAccount = z.infer<typeof ExchangeAccountSchema>;
