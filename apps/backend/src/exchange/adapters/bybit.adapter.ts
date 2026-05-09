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
      category: 'linear',
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
    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    const body = {
      category: 'linear',
      symbol: symbol.toUpperCase(),
      orderId: orderId,
    };

    const sign = this.createSignature(timestamp, recvWindow, JSON.stringify(body));

    try {
      const response = await axios.post(`${this.baseUrl}/v5/order/cancel`, body, {
        headers: {
          'X-BAPI-API-KEY': this.apiKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': sign,
          'Content-Type': 'application/json',
        },
      });

      return response.data.retCode === 0;
    } catch (error: any) {
      console.error('[BybitAdapter] cancelOrder error:', error.response?.data || error.message);
      return false;
    }
  }

  async getOrder(orderId: string, symbol: string): Promise<OrderResult | null> {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    const params = new URLSearchParams({
      category: 'linear',
      symbol: symbol.toUpperCase(),
      orderId: orderId,
    });

    const sign = this.createSignature(timestamp, recvWindow, params.toString());

    try {
      const response = await axios.get(`${this.baseUrl}/v5/order/realtime`, {
        params: {
          category: 'linear',
          symbol: symbol.toUpperCase(),
          orderId: orderId,
        },
        headers: {
          'X-BAPI-API-KEY': this.apiKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': sign,
        },
      });

      if (response.data.retCode !== 0 || !response.data.result?.list?.length) {
        return null;
      }

      const data = response.data.result.list[0];

      return {
        orderId: data.orderId,
        exchangeOrderId: data.orderId,
        symbol: data.symbol,
        side: data.side as OrderSide,
        type: data.orderType as OrderType,
        status: data.orderStatus,
        quantity: parseFloat(data.qty),
        filledQuantity: parseFloat(data.cumExecQty),
        price: data.price ? parseFloat(data.price) : undefined,
        averagePrice: data.avgPrice ? parseFloat(data.avgPrice) : undefined,
        timestamp: parseInt(data.createdTime),
      };
    } catch (error: any) {
      console.error('[BybitAdapter] getOrder error:', error.response?.data || error.message);
      return null;
    }
  }

  async getPositions(): Promise<any[]> {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    const sign = this.createSignature(timestamp, recvWindow, '');

    try {
      const response = await axios.get(`${this.baseUrl}/v5/position/list`, {
        params: {
          category: 'linear',
          settleCoin: 'USDT',
        },
        headers: {
          'X-BAPI-API-KEY': this.apiKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': sign,
        },
      });

      if (response.data.retCode !== 0) return [];

      return response.data.result.list.map((pos: any) => ({
        symbol: pos.symbol,
        positionAmt: parseFloat(pos.size),
        entryPrice: parseFloat(pos.avgPrice),
        unrealizedProfit: parseFloat(pos.unrealisedPnl),
        leverage: parseInt(pos.leverage),
      }));
    } catch (error: any) {
      console.error('[BybitAdapter] getPositions error:', error.response?.data || error.message);
      return [];
    }
  }

  async getAccountBalance(): Promise<any> {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    const sign = this.createSignature(timestamp, recvWindow, '');

    try {
      const response = await axios.get(`${this.baseUrl}/v5/account/wallet-balance`, {
        params: {
          accountType: 'UNIFIED',
        },
        headers: {
          'X-BAPI-API-KEY': this.apiKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': sign,
        },
      });

      if (response.data.retCode !== 0) return { balances: [] };

      const coinList = response.data.result.list[0]?.coin || [];

      return {
        balances: coinList
          .filter((c: any) => parseFloat(c.walletBalance) > 0)
          .map((c: any) => ({
            asset: c.coin,
            free: parseFloat(c.availableToWithdraw),
            locked: parseFloat(c.locked),
          })),
      };
    } catch (error: any) {
      console.error('[BybitAdapter] getAccountBalance error:', error.response?.data || error.message);
      return { balances: [] };
    }
  }

  private createSignature(timestamp: string, recvWindow: string, body: string): string {
    const param = timestamp + this.apiKey + recvWindow + body;
    return crypto.createHmac('sha256', this.apiSecret).update(param).digest('hex');
  }
}
