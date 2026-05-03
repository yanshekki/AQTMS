import { z } from 'zod';

export const ExchangeType = {
  BINANCE: 'BINANCE',
  BYBIT: 'BYBIT',
  FUTU: 'FUTU',
  IBKR: 'IBKR',
} as const;
export const ExchangeTypeSchema = z.enum(['BINANCE', 'BYBIT', 'FUTU', 'IBKR']);

export const ConnectionStatus = {
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR',
  TESTING: 'TESTING',
} as const;
export const ConnectionStatusSchema = z.enum([
  'CONNECTED',
  'DISCONNECTED',
  'ERROR',
  'TESTING',
]);

export const ExchangeAccountSchema = z.object({
  id: z.string(),
  exchange: ExchangeTypeSchema,
  name: z.string().min(1),
  status: ConnectionStatusSchema,
  testPassed: z.boolean().default(false),
  createdAt: z.string(),
});

export type ExchangeAccount = z.infer<typeof ExchangeAccountSchema>;
