// ── Trade API Client ──
// Updated for Phase 2.1 - Stop Loss / Take Profit support

import { z } from 'zod';
import { safePost } from '@/shared/api';

// Schema for creating a trade (manual order with protection)
export const CreateTradeSchema = z.object({
  exchangeAccountId: z.string().min(1, 'Exchange account is required'),
  symbol: z.string().min(1, 'Symbol is required').toUpperCase(),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive().optional(),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK']).optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
});

export type CreateTradeInput = z.infer<typeof CreateTradeSchema>;

interface TradeResponse {
  success: boolean;
  data: {
    id: string;
    exchangeOrderId: string;
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    price: number | null;
    status: string;
    filledQuantity: number;
  };
  timestamp: string;
}

export const tradeApi = {
  async placeOrder(data: CreateTradeInput): Promise<TradeResponse['data']> {
    const parsed = CreateTradeSchema.parse(data);

    const response = await safePost('/api/v1/trades', parsed,
      z.object({
        success: z.literal(true),
        data: z.object({
          id: z.string(),
          exchangeOrderId: z.string(),
          symbol: z.string(),
          side: z.string(),
          type: z.string(),
          quantity: z.number(),
          price: z.number().nullable(),
          status: z.string(),
          filledQuantity: z.number(),
        }),
        timestamp: z.string(),
      })
    );

    return response.data;
  },

  async cancelOrder(tradeId: string) {
    return safePost(`/api/v1/trades/${tradeId}/cancel`, {},
      z.object({ success: z.literal(true), data: z.any(), timestamp: z.string() })
    );
  },
};
