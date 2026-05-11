import { OrderStatus } from './order-status.vo';

export interface CreateOrderDto {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Order {
  id: string;
  userId: string;
  exchangeAccountId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  quantity: number;
  price?: number;
  status: OrderStatus;
  filledQuantity: number;
  createdAt: Date;
}
