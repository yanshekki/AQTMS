import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { IExchangeAdapter, PlaceOrderParams, OrderResult } from '../interfaces/exchange.adapter';
import { OrderSide, OrderType } from '../types/order.types';

@Injectable()
export class BybitAdapter implements IExchangeAdapter {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.BYBIT_API_KEY || '';
    this.apiSecret = process.env.BYBIT_API_SECRET || '';
    this.baseUrl = process.env.BYBIT_TESTNET === 'true'
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com';
  }

  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    const body = {
      category: 'linear', // or 'spot'
      symbol: params.symbol.toUpperCase(),
      side: params.side.toUpperCase(),
      orderType: params.type.toUpperCase(),
      qty: params.quantity.toString(),
      ...(params.price && { price: params.price.toString() }),
      ...(params.stopPrice && { stopLoss: params.stopPrice.toString() }),
    };

    const sign = this.createSignature(timestamp, recvWindow, JSON.stringify(body));

    try {
      const response = await axios.post(`${this.baseUrl}/v5/order/create`, body, {
        headers: {
          'X-BAPI-API-KEY': this.apiKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': sign,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data.result;

      return {
        orderId: data.orderId,
        exchangeOrderId: data.orderId,
        symbol: params.symbol,
        side: params.side,
        type: params.type,
        status: data.orderStatus || 'New',
        quantity: params.quantity,
        filledQuantity: 0,
        price: params.price,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error('[BybitAdapter] placeOrder error:', error.response?.data || error.message);
      throw new Error(`Bybit placeOrder failed: ${error.response?.data?.retMsg || error.message}`);
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    // TODO: implement Bybit cancel order
    console.log('[BybitAdapter] cancelOrder (TODO)');
    return true;
  }

  async getOrder(orderId: string, symbol: string): Promise<OrderResult | null> {
    // TODO: implement Bybit get order
    console.log('[BybitAdapter] getOrder (TODO)');
    return null;
  }

  async getPositions(): Promise<any[]> {
    // TODO: implement Bybit positions
    return [];
  }

  async getAccountBalance(): Promise<any> {
    // TODO: implement Bybit wallet balance
    return {};
  }

  private createSignature(timestamp: string, recvWindow: string, body: string): string {
    const param = timestamp + this.apiKey + recvWindow + body;
    return crypto.createHmac('sha256', this.apiSecret).update(param).digest('hex');
  }
}
