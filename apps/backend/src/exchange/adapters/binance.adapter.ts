import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
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
    this.baseUrl = process.env.BINANCE_TESTNET === 'true'
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';
  }

  // ... existing placeOrder() implementation ...

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    const timestamp = Date.now();
    const queryObj = {
      symbol: symbol.toUpperCase(),
      orderId,
      timestamp,
    };

    const queryString = new URLSearchParams(queryObj).toString();
    const signature = this.createSignature(queryString);

    try {
      await axios.delete(`${this.baseUrl}/api/v3/order`, {
        params: {
          ...queryObj,
          signature,
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey,
        },
      });
      return true;
    } catch (error: any) {
      console.error('[BinanceAdapter] cancelOrder error:', error.response?.data || error.message);
      return false;
    }
  }

  async getOrder(orderId: string, symbol: string): Promise<OrderResult | null> {
    const timestamp = Date.now();
    const queryObj = {
      symbol: symbol.toUpperCase(),
      orderId,
      timestamp,
    };

    const queryString = new URLSearchParams(queryObj).toString();
    const signature = this.createSignature(queryString);

    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/order`, {
        params: {
          ...queryObj,
          signature,
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey,
        },
      });

      const data = response.data;

      return {
        orderId: data.orderId?.toString() || '',
        exchangeOrderId: data.orderId?.toString() || '',
        symbol: data.symbol,
        side: data.side as OrderSide,
        type: data.type as OrderType,
        status: data.status,
        quantity: parseFloat(data.origQty),
        filledQuantity: parseFloat(data.executedQty),
        price: data.price ? parseFloat(data.price) : undefined,
        averagePrice: data.avgPrice ? parseFloat(data.avgPrice) : undefined,
        timestamp: data.time || Date.now(),
      };
    } catch (error: any) {
      if (error.response?.status === 400) {
        // Order not found
        return null;
      }
      console.error('[BinanceAdapter] getOrder error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPositions(): Promise<any[]> {
    // TODO: implement futures/spot position endpoint
    return [];
  }

  async getAccountBalance(): Promise<any> {
    // TODO: implement account balance endpoint
    return {};
  }

  private createSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }
}
