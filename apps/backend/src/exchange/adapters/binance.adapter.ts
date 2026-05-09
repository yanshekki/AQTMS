import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IExchangeAdapter, PlaceOrderParams, OrderResult } from '../interfaces/exchange.adapter';
import { OrderSide, OrderType } from '../types/order.types';

@Injectable()
export class BinanceAdapter implements IExchangeAdapter {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.BINANCE_API_KEY || '';
    this.apiSecret = process.env.BINANCE_API_SECRET || '';
    // 使用 Testnet
    this.baseUrl = process.env.BINANCE_TESTNET === 'true'
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';
  }

  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    console.log('[BinanceAdapter] Placing order (TODO: implement real API call)', params);

    // TODO: 實作真實 Binance API 呼叫 + 簽名
    // const timestamp = Date.now();
    // const query = this.buildQuery(params, timestamp);
    // const signature = this.sign(query);
    // const response = await axios.post(...);

    // 暫時返回 mock 結果
    return {
      orderId: 'binance-' + Date.now(),
      exchangeOrderId: 'EX-' + Date.now(),
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      status: 'NEW',
      quantity: params.quantity,
      filledQuantity: 0,
      price: params.price,
      timestamp: Date.now(),
    };
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    console.log('[BinanceAdapter] Cancel order (TODO)', orderId, symbol);
    return true;
  }

  async getOrder(orderId: string, symbol: string): Promise<OrderResult | null> {
    console.log('[BinanceAdapter] Get order (TODO)', orderId, symbol);
    return null;
  }

  async getPositions(): Promise<any[]> {
    console.log('[BinanceAdapter] Get positions (TODO)');
    return [];
  }

  async getAccountBalance(): Promise<any> {
    console.log('[BinanceAdapter] Get balance (TODO)');
    return {};
  }

  // TODO: 實作簽名邏輯
  // private sign(query: string): string { ... }
  // private buildQuery(params: any, timestamp: number): string { ... }
}
