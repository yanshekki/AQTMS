// ── Domain Entities ──

export type TradeStatus =
  | 'PENDING'
  | 'FILLED'
  | 'PARTIALLY_FILLED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export type OrderSide = 'BUY' | 'SELL';

export type OrderType =
  | 'MARKET'
  | 'LIMIT'
  | 'STOP_LOSS'
  | 'STOP_LOSS_LIMIT'
  | 'TAKE_PROFIT'
  | 'TAKE_PROFIT_LIMIT';

export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

export interface Trade {
  readonly id: string;
  readonly exchangeOrderId: string | null;
  readonly exchangeAccountId: string;
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantity: number;
  readonly price: number | null;
  readonly stopPrice: number | null;
  readonly timeInForce: TimeInForce;
  readonly status: TradeStatus;
  readonly filledQuantity: number;
  readonly idempotencyKey: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ITradeRepository {
  save(trade: Trade, userId?: string): Promise<Trade>;
  findById(id: string): Promise<Trade | null>;
  findByIdempotencyKey(key: string): Promise<Trade | null>;
  updateStatus(id: string, status: TradeStatus, filledQuantity?: number): Promise<Trade>;
}
