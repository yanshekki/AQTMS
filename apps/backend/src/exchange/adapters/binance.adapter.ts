import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { IExchangeAdapter, PlaceOrderParams, OrderResult } from '../interfaces/exchange.adapter';
import { OrderSide, OrderType } from '../interfaces/exchange.adapter';

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

  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    // TODO: Implement real Binance order placement
    return { orderId: 'demo-order', exchangeOrderId: 'demo-order', symbol: params.symbol, side: params.side, type: params.type, status: 'NEW', quantity: params.quantity, filledQuantity: 0, timestamp: Date.now() };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    // TODO: Implement real cancel
    return true;
  }

  async getOrder(orderId: string): Promise<any> {
    // TODO: Implement real get order
    return {};
  }

  async getPositions(): Promise<any[]> {
    const timestamp = Date.now();
    const queryObj = { timestamp: timestamp.toString() };
    const queryString = new URLSearchParams(queryObj).toString();
    const signature = this.createSignature(queryString);

    try {
      const response = await axios.get(`${this.baseUrl}/fapi/v2/positionRisk`, {
        params: {
          timestamp,
          signature,
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey,
        },
      });

      return response.data.map((pos: any) => ({
        symbol: pos.symbol,
        positionAmt: parseFloat(pos.positionAmt),
        entryPrice: parseFloat(pos.entryPrice),
        unrealizedProfit: parseFloat(pos.unRealizedProfit),
        leverage: parseInt(pos.leverage),
      }));
    } catch (error: any) {
      console.error('[BinanceAdapter] getPositions error:', error.response?.data || error.message);
      return [];
    }
  }

  async getAccountBalance(): Promise<any> {
    const timestamp = Date.now();
    const queryObj = { timestamp: timestamp.toString() };
    const queryString = new URLSearchParams(queryObj).toString();
    const signature = this.createSignature(queryString);

    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/account`, {
        params: {
          timestamp,
          signature,
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey,
        },
      });

      return {
        balances: response.data.balances
          .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
          .map((b: any) => ({
            asset: b.asset,
            free: parseFloat(b.free),
            locked: parseFloat(b.locked),
          })),
      };
    } catch (error: any) {
      console.error('[BinanceAdapter] getAccountBalance error:', error.response?.data || error.message);
      return { balances: [] };
    }
  }

  private createSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }
}
