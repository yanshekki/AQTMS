// ── Trade DTOs (Zod schemas + inferred types) ──
// Re-export shared types for convenience; add backend-specific DTOs here.

import { z } from 'zod';
import {
  CreateTradeDtoSchema,
  CancelTradeDtoSchema,
  TradeResponseDtoSchema,
} from '@aqtms/shared-types';

// Re-export shared DTO schemas
export { CreateTradeDtoSchema, CancelTradeDtoSchema, TradeResponseDtoSchema };

// Backend-specific DTOs
export const ExchangeConnectRequestSchema = z.object({
  exchange: z.enum(['BINANCE', 'BYBIT']).transform((v) => v.toUpperCase()),
  name: z.string().min(1).max(100).optional().default('My Exchange'),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  testnet: z.boolean().optional().default(false),
});
export type ExchangeConnectRequest = z.infer<typeof ExchangeConnectRequestSchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const IdParamSchema = z.object({
  id: z.string().min(1),
});
export type IdParam = z.infer<typeof IdParamSchema>;
