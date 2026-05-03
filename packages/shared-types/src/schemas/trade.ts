import { z } from 'zod';

// ── Common Enums ──
export const OrderSide = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;
export const OrderSideSchema = z.enum(['BUY', 'SELL']);

export const OrderType = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  STOP_LOSS: 'STOP_LOSS',
  STOP_LOSS_LIMIT: 'STOP_LOSS_LIMIT',
  TAKE_PROFIT: 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT: 'TAKE_PROFIT_LIMIT',
} as const;
export const OrderTypeSchema = z.enum([
  'MARKET',
  'LIMIT',
  'STOP_LOSS',
  'STOP_LOSS_LIMIT',
  'TAKE_PROFIT',
  'TAKE_PROFIT_LIMIT',
]);

export const OrderStatus = {
  PENDING: 'PENDING',
  FILLED: 'FILLED',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;
export const OrderStatusSchema = z.enum([
  'PENDING',
  'FILLED',
  'PARTIALLY_FILLED',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
]);

export const TimeInForce = {
  GTC: 'GTC',
  IOC: 'IOC',
  FOK: 'FOK',
} as const;
export const TimeInForceSchema = z.enum(['GTC', 'IOC', 'FOK']);

// ── Money Value-Object ──
export const MoneySchema = z.object({
  amount: z.string(),
  currency: z.string().min(1).max(10),
});
export type Money = z.infer<typeof MoneySchema>;

// ── Create Trade DTO ──
export const CreateTradeDtoSchema = z.object({
  exchangeAccountId: z.string().min(1),
  symbol: z.string().min(1).max(20),
  side: OrderSideSchema,
  type: OrderTypeSchema,
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  timeInForce: TimeInForceSchema.optional().default('GTC'),
  idempotencyKey: z.string().uuid(),
});
export type CreateTradeDto = z.infer<typeof CreateTradeDtoSchema>;

// ── Trade Response DTO ──
export const TradeResponseDtoSchema = z.object({
  id: z.string(),
  exchangeOrderId: z.string(),
  exchangeAccountId: z.string(),
  symbol: z.string(),
  side: OrderSideSchema,
  type: OrderTypeSchema,
  quantity: z.number(),
  price: z.number().nullable(),
  status: OrderStatusSchema,
  filledQuantity: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TradeResponseDto = z.infer<typeof TradeResponseDtoSchema>;

// ── Cancel Trade DTO ──
export const CancelTradeDtoSchema = z.object({
  exchangeAccountId: z.string().min(1),
  symbol: z.string().min(1),
  exchangeOrderId: z.string().min(1),
});
export type CancelTradeDto = z.infer<typeof CancelTradeDtoSchema>;

// ── Balance Query ──
export const BalanceQuerySchema = z.object({
  exchangeAccountId: z.string().min(1),
});
export type BalanceQuery = z.infer<typeof BalanceQuerySchema>;

// ── Balance Response ──
export const BalanceResponseSchema = z.object({
  exchange: z.string(),
  balances: z.array(
    z.object({
      asset: z.string(),
      free: z.string(),
      locked: z.string(),
    }),
  ),
  updatedAt: z.string(),
});
export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;

// ── Position Query / Response ──
export const PositionResponseSchema = z.object({
  exchange: z.string(),
  positions: z.array(
    z.object({
      symbol: z.string(),
      side: OrderSideSchema,
      quantity: z.number(),
      entryPrice: z.number(),
      markPrice: z.number(),
      unrealizedPnl: z.string(),
    }),
  ),
  updatedAt: z.string(),
});
export type PositionResponse = z.infer<typeof PositionResponseSchema>;
