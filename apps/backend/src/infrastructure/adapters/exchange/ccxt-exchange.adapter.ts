import { Injectable, Logger } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { IExchangeAdapter, PlaceOrderParams, PlaceOrderResult, OrderStatusResult } from './exchange.adapter.interface';

interface ExchangeConfig {
  exchange: string;
  apiKey: string;
  apiSecret?: string;
  testnet?: boolean;
}

@Injectable()
export class CcxtExchangeAdapter implements IExchangeAdapter {
  private readonly logger = new Logger(CcxtExchangeAdapter.name);
  private exchangeInstances: Map<string, any> = new Map();

  async initialize(config: ExchangeConfig): Promise<void> {
    const cacheKey = `${config.exchange.toLowerCase()}-${config.testnet ? 'testnet' : 'mainnet'}`;

    if (this.exchangeInstances.has(cacheKey)) {
      return;
    }

    let exchange: any;

    const commonOptions = {
      apiKey: config.apiKey,
      secret: config.apiSecret,
      enableRateLimit: true,
      sandbox: config.testnet ?? false,
    };

    const exchangeName = config.exchange.toLowerCase();

    if (exchangeName === 'binance') {
      exchange = new ccxt.binance({
        ...commonOptions,
        options: { defaultType: 'spot' },
      });
    } else if (exchangeName === 'bybit') {
      exchange = new ccxt.bybit({
        ...commonOptions,
        options: { defaultType: 'spot' },
      });
    } else {
      throw new Error(`Unsupported exchange: ${config.exchange}. Supported: binance, bybit`);
    }

    this.exchangeInstances.set(cacheKey, exchange);
    this.logger.log(`Initialized ${config.exchange} adapter (testnet=${config.testnet})`);
  }

  private getExchangeInstance(exchangeName: string, testnet = false): any {
    const cacheKey = `${exchangeName.toLowerCase()}-${testnet ? 'testnet' : 'mainnet'}`;
    const instance = this.exchangeInstances.get(cacheKey);

    if (!instance) {
      throw new Error(`Exchange ${exchangeName} not initialized. Call initialize() first.`);
    }
    return instance;
  }

  async placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    try {
      const exchange = this.getExchangeInstance(params.exchange, params.testnet ?? false);

      const orderType = params.type === 'MARKET' ? 'market' : 'limit';
      const side = params.side.toLowerCase();

      const orderParams: any = {
        symbol: params.symbol,
        type: orderType,
        side,
        amount: params.quantity,
      };

      if (params.price && orderType === 'limit') {
        orderParams.price = params.price;
      }

      if (!params.testnet && process.env.ENABLE_LIVE_TRADING !== 'true') {
        this.logger.warn('Live trading is disabled. Set ENABLE_LIVE_TRADING=true to enable.');
        return { success: false, message: 'Live trading is currently disabled for safety.' };
      }

      const result = await exchange.createOrder(
        orderParams.symbol,
        orderParams.type,
        orderParams.side,
        orderParams.amount,
        orderParams.price,
      );

      return {
        success: true,
        exchangeOrderId: result.id,
        status: result.status,
        filledQuantity: result.filled || 0,
        remainingQuantity: result.remaining || params.quantity,
        filledPrice: result.average || result.price,
      };
    } catch (error: any) {
      this.logger.error(`placeOrder failed on ${params.exchange}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async cancelOrder(exchangeAccountId: string, exchangeOrderId: string): Promise<boolean> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      await ex.cancelOrder(exchangeOrderId);
      return true;
    } catch (error: any) {
      this.logger.error(`cancelOrder failed: ${error.message}`);
      return false;
    }
  }

  async getBalance(exchangeAccountId: string): Promise<number> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      const balance = await ex.fetchBalance();
      return balance.total || 0;
    } catch (error: any) {
      this.logger.error(`getBalance failed: ${error.message}`);
      return 0;
    }
  }

  async getPositions(exchangeAccountId: string): Promise<any[]> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      return await ex.fetchPositions().catch(() => []);
    } catch (error: any) {
      return [];
    }
  }

  async getOrderStatus(exchangeAccountId: string, exchangeOrderId: string): Promise<OrderStatusResult | null> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      const order = await ex.fetchOrder(exchangeOrderId);
      return {
        exchangeOrderId: order.id,
        status: order.status,
        filledQuantity: order.filled || 0,
        remainingQuantity: order.remaining || 0,
        averagePrice: order.average || order.price,
        lastUpdate: new Date(),
      };
    } catch (error: any) {
      return null;
    }
  }

  async getOpenOrders(exchangeAccountId: string, symbol?: string): Promise<any[]> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      return await ex.fetchOpenOrders(symbol).catch(() => []);
    } catch (error: any) {
      this.logger.error(`getOpenOrders failed: ${error.message}`);
      return [];
    }
  }

  async getTicker(symbol: string, exchange = 'binance', testnet = false) {
    try {
      const ex = this.getExchangeInstance(exchange, testnet);
      return await ex.fetchTicker(symbol);
    } catch (error: any) {
      this.logger.error(`getTicker failed: ${error.message}`);
      return null;
    }
  }

  async getOHLCV(symbol: string, timeframe = '1m', limit = 100, exchange = 'binance', testnet = false) {
    try {
      const ex = this.getExchangeInstance(exchange, testnet);
      return await ex.fetchOHLCV(symbol, timeframe, limit);
    } catch (error: any) {
      this.logger.error(`getOHLCV failed: ${error.message}`);
      return [];
    }
  }
}
