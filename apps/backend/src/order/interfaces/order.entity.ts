import { OrderStatus } from './order-status.enum';

export interface Order {
  id: string;
  userId: string;
  exchange: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: OrderStatus;
  filledQuantity: number;
  averageFillPrice?: number;
  createdAt: Date;
  updatedAt: Date;
  exchangeOrderId?: string; // 交易所返回的訂單 ID
}
