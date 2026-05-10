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
}

export interface PlaceOrderResult {
  success: boolean;
  exchangeOrderId?: string;
  message?: string;
  filledPrice?: number;
}

export interface IExchangeAdapter {
  placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult>;
  cancelOrder(exchangeAccountId: string, exchangeOrderId: string): Promise<boolean>;
  getBalance(exchangeAccountId: string): Promise<number>;
  getPositions(exchangeAccountId: string): Promise<any[]>;
  // Future: getOrderStatus, subscribeToFills etc.
}