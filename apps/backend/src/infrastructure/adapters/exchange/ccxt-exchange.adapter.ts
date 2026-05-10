import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ccxt from 'ccxt';
import { IExchangeAdapter, PlaceOrderParams, PlaceOrderResult, OrderStatusResult } from './exchange.adapter.interface';
import { OrderSide, OrderType } from '../../../domain/value-objects/order-types';

@Injectable()
export class CcxtExchangeAdapter implements IExchangeAdapter {
  private readonly logger = new Logger(CcxtExchangeAdapter.name);
  private exchangeInstances: Map<string, any> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.logger.log('CcxtExchangeAdapter initialized (enhanced for real execution, partial fills, reconciliation)');
  }

  private async getExchangeInstance(exchangeAccountId: string, exchangeName: string = 'binance', isPaper: boolean = true): Promise<any> {
    const cacheKey = `${exchangeAccountId}-${exchangeName}-${isPaper ? 'paper' : 'live'}`;
    if (this.exchangeInstances.has(cacheKey)) {
      return this.exchangeInstances.get(cacheKey);
    }

    let exchange: any;
    const apiKey = this.configService.get(`${exchangeName.toUpperCase()}_API_KEY`) || 'demo-key';
    const secret = this.configService.get(`${exchangeName.toUpperCase()}_API_SECRET`) || 'demo-secret';

    if (exchangeName.toLowerCase() === 'binance') {
      exchange = new ccxt.binance({
        apiKey,
        secret,
        sandbox: isPaper,
        enableRateLimit: true,
        options: { defaultType: 'spot' },
      });
    } else if (exchangeName.toLowerCase() === 'bybit') {
      exchange = new ccxt.bybit({
        apiKey,
        secret,
        sandbox: isPaper,
        enableRateLimit: true,
        options: { defaultType: 'spot' },
      });
    } else {
      throw new Error(`Unsupported exchange: ${exchangeName}`);
    }

    this.exchangeInstances.set(cacheKey, exchange);
    return exchange;
  }

  async placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    try {
      const exchangeName = 'binance'; // TODO: resolve from ExchangeAccount via Prisma
      const isPaper = params.isPaper ?? true;
      const exchange = await this.getExchangeInstance(params.exchangeAccountId, exchangeName, isPaper);

      const orderType = params.type === OrderType.MARKET ? 'market' : 'limit';
      const side = params.side === OrderSide.BUY ? 'buy' : 'sell';

      const orderParams: any = {
        symbol: params.symbol,
        type: orderType,
        side,
        amount: params.quantity,
      };

      if (params.type === OrderType.LIMIT && params.price) {
        orderParams.price = params.price;
      }

      // Enhanced SL/TP support (ccxt unified API - works better on futures/perp; for spot use OCO or post-processing)
      if (params.stopLoss || params.takeProfit) {
        orderParams.params = orderParams.params || {};
        if (params.stopLoss) {
          orderParams.params.stopPrice = params.stopLoss;
          orderParams.params.stopLossPrice = params.stopLoss;
        }
        if (params.takeProfit) {
          orderParams.params.takeProfitPrice = params.takeProfit;
        }
        this.logger.log(`SL/TP attached for ${params.symbol}: SL=${params.stopLoss}, TP=${params.takeProfit}`);
      }

      const result = await exchange.createOrder(
        orderParams.symbol,
        orderParams.type,
        orderParams.side,
        orderParams.amount,
        orderParams.price,
        orderParams.params,
      );

      this.logger.log(`ccxt order placed: ${result.id} on ${exchangeName} (paper=${isPaper}), status=${result.status}, filled=${result.filled}`);

      return {
        success: true,
        exchangeOrderId: result.id,
        message: 'Order placed successfully via ccxt',
        filledPrice: result.average || result.price || result.filledPrice,
        status: result.status || 'open',
        filledQuantity: result.filled || 0,
        remainingQuantity: result.remaining || params.quantity,
      };
    } catch (error) {
      this.logger.error(`ccxt placeOrder error: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async cancelOrder(exchangeAccountId: string, exchangeOrderId: string): Promise<boolean> {
    try {
      const exchange = await this.getExchangeInstance(exchangeAccountId);
      await exchange.cancelOrder(exchangeOrderId);
      this.logger.log(`Order ${exchangeOrderId} cancelled`);
      return true;
    } catch (error) {
      this.logger.error(`Cancel error: ${error.message}`);
      return false;
    }
  }

  async getBalance(exchangeAccountId: string): Promise<number> {
    try {
      const exchange = await this.getExchangeInstance(exchangeAccountId);
      const balance = await exchange.fetchBalance();
      return balance.total?.USDT || balance.total?.['USDT'] || 0;
    } catch (error) {
      this.logger.error(`getBalance error: ${error.message}`);
      return 0;
    }
  }

  async getPositions(exchangeAccountId: string): Promise<any[]> {
    try {
      const exchange = await this.getExchangeInstance(exchangeAccountId);
      // For spot, use fetchPositions or fetchBalance + open orders; for futures it's direct
      const positions = await exchange.fetchPositions().catch(() => []);
      return positions || [];
    } catch (error) {
      this.logger.error(`getPositions error: ${error.message}`);
      return [];
    }
  }

  async getOrderStatus(exchangeAccountId: string, exchangeOrderId: string): Promise<OrderStatusResult | null> {
    try {
      const exchange = await this.getExchangeInstance(exchangeAccountId);
      const order = await exchange.fetchOrder(exchangeOrderId);
      if (!order) return null;

      return {
        exchangeOrderId: order.id,
        status: order.status,
        filledQuantity: order.filled || 0,
        remainingQuantity: order.remaining || 0,
        averagePrice: order.average || order.price,
        lastUpdate: new Date(order.timestamp || Date.now()),
      };
    } catch (error) {
      this.logger.error(`getOrderStatus error for ${exchangeOrderId}: ${error.message}`);
      return null;
    }
  }

  async getOpenOrders(exchangeAccountId: string, symbol?: string): Promise<any[]> {
    try {
      const exchange = await this.getExchangeInstance(exchangeAccountId);
      const openOrders = await exchange.fetchOpenOrders(symbol);
      this.logger.log(`Fetched ${openOrders.length} open orders for reconciliation`);
      return openOrders || [];
    } catch (error) {
      this.logger.error(`getOpenOrders error: ${error.message}`);
      return [];
    }
  }
}