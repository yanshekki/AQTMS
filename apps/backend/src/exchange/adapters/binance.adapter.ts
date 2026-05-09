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

  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    const timestamp = Date.now();

    const queryObj: any = {
      symbol: params.symbol.toUpperCase(),
      side: params.side.toUpperCase(),
      type: params.type.toUpperCase(),
      quantity: params.quantity,
      timestamp,
    };

    if (params.price) queryObj.price = params.price;
    if (params.stopPrice) queryObj.stopPrice = params.stopPrice;
    if (params.timeInForce) queryObj.timeInForce = params.timeInForce;
    if (params.reduceOnly !== undefined) queryObj.reduceOnly = params.reduceOnly;

    const queryString = new URLSearchParams(queryObj).toString();
    const signature = this.createSignature(queryString);

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v3/order`,
        null,
        {
          params: {
            ...queryObj,
            signature,
          },
          headers: {
            'X-MBX-APIKEY': this.apiKey,
          },
        },
      );

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
        timestamp: data.transactTime || Date.now(),
      };
    } catch (error: any) {
      console.error('[BinanceAdapter] placeOrder error:', error.response?.data || error.message);
      throw new Error(`Binance placeOrder failed: ${error.response?.data?.msg || error.message}`);
    }
  }

  private createSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  // ... other methods (cancelOrder, getOrder, etc.) still TODO ...
}
