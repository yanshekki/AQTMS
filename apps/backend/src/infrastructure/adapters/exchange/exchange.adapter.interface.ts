import { OrderSide, OrderType } from '../../../domain/value-objects/order-types';

export interface PlaceOrderParams {
  exchangeAccountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  isPaper?: boolean;
}

export interface PlaceOrderResult {
  success: boolean;
  exchangeOrderId?: string;
  message?: string;
  filledPrice?: number;
  status?: string;
  filledQuantity?: number;
  remainingQuantity?: number;
}

export interface OrderStatusResult {
  exchangeOrderId: string;
  status: 'open' | 'closed' | 'canceled' | 'partially_filled' | string;
  filledQuantity: number;
  remainingQuantity: number;
  averagePrice?: number;
  lastUpdate: Date;
}

export interface IExchangeAdapter {
  placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult>;
  cancelOrder(exchangeAccountId: string, exchangeOrderId: string): Promise<boolean>;
  getBalance(exchangeAccountId: string): Promise<number>;
  getPositions(exchangeAccountId: string): Promise<any[]>;
  getOrderStatus(exchangeAccountId: string, exchangeOrderId: string): Promise<OrderStatusResult | null>;
  getOpenOrders(exchangeAccountId: string, symbol?: string): Promise<any[]>;
}