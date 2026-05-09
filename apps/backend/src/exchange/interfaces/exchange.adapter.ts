import { OrderSide, OrderType } from '../types/order.types';

export interface PlaceOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: string;
  reduceOnly?: boolean;
}

export interface OrderResult {
  orderId: string;
  exchangeOrderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: string;
  quantity: number;
  filledQuantity: number;
  price?: number;
  averagePrice?: number;
  timestamp: number;
}

export interface IExchangeAdapter {
  /**
   * 下單
   */
  placeOrder(params: PlaceOrderParams): Promise<OrderResult>;

  /**
   * 取消訂單
   */
  cancelOrder(orderId: string, symbol: string): Promise<boolean>;

  /**
   * 查詢訂單狀態
   */
  getOrder(orderId: string, symbol: string): Promise<OrderResult | null>;

  /**
   * 獲取當前持倉
   */
  getPositions(): Promise<any[]>;

  /**
   * 獲取帳戶餘額
   */
  getAccountBalance(): Promise<any>;
}
