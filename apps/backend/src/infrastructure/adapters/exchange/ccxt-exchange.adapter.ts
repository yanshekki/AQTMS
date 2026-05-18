import { Injectable, Logger } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { IExchangeAdapter, PlaceOrderParams, PlaceOrderResult, OrderStatusResult } from './exchange.adapter.interface';
import { BaseTradingAdapter, OrderRequest, CancelOrderRequest, Trade, Balance, Position } from '../exchanges/BaseTradingAdapter';

interface ExchangeConfig {
  exchange: string;
  apiKey: string;
  apiSecret?: string;
  testnet?: boolean;
}

@Injectable()
export class CcxtExchangeAdapter extends BaseTradingAdapter implements IExchangeAdapter {
  public readonly exchangeName = 'CCXT';
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

  // ── BaseTradingAdapter implementations ──

  async createOrder(request: OrderRequest): Promise<Trade> {
    try {
      const ex = this.getExchangeInstance('binance');
      const order = await ex.createOrder(
        request.symbol,
        request.type.toLowerCase(),
        request.side.toLowerCase(),
        request.quantity,
        request.price
      );

      const now = new Date();
      return {
        id: order.id || `trade-${Date.now()}`,
        exchangeOrderId: order.id || null,
        exchangeAccountId: 'default',
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        quantity: request.quantity,
        price: request.price || null,
        stopPrice: request.stopPrice || null,
        timeInForce: request.timeInForce || 'GTC',
        status: (order.status?.toUpperCase() || 'PENDING') as any,
        filledQuantity: order.filled || 0,
        idempotencyKey: request.idempotencyKey,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      this.handleError(error, 'createOrder');
    }
  }

  async cancelOrder(request: CancelOrderRequest): Promise<Trade> {
    try {
      const ex = this.getExchangeInstance('binance');
      const result = await ex.cancelOrder(request.exchangeOrderId, request.symbol);

      const now = new Date();
      return {
        id: `cancel-${request.exchangeOrderId}`,
        exchangeOrderId: request.exchangeOrderId,
        exchangeAccountId: 'default',
        symbol: request.symbol,
        side: 'SELL' as any,
        type: 'LIMIT' as any,
        quantity: 0,
        price: null,
        stopPrice: null,
        timeInForce: 'GTC',
        status: 'CANCELLED' as any,
        filledQuantity: 0,
        idempotencyKey: `cancel-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      this.handleError(error, 'cancelOrder');
    }
  }

  async getOrder(exchangeOrderId: string, symbol: string): Promise<Trade> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      const order = await ex.fetchOrder(exchangeOrderId, symbol);

      const now = new Date();
      return {
        id: order.id,
        exchangeOrderId: order.id,
        exchangeAccountId: 'default',
        symbol: order.symbol || symbol,
        side: order.side?.toUpperCase() as any || 'BUY',
        type: order.type?.toUpperCase() as any || 'MARKET',
        quantity: order.amount || 0,
        price: order.price || null,
        stopPrice: null,
        timeInForce: 'GTC',
        status: (order.status?.toUpperCase() || 'PENDING') as any,
        filledQuantity: order.filled || 0,
        idempotencyKey: '',
        createdAt: order.datetime ? new Date(order.datetime) : now,
        updatedAt: now,
      };
    } catch (error: any) {
      this.handleError(error, 'getOrder');
    }
  }

  async getOpenOrders(symbol?: string): Promise<Trade[]> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      const orders = await ex.fetchOpenOrders(symbol).catch(() => []);
      return orders.map((order: any) => {
        const now = new Date();
        return {
          id: order.id,
          exchangeOrderId: order.id,
          exchangeAccountId: 'default',
          symbol: order.symbol,
          side: order.side?.toUpperCase() as any,
          type: order.type?.toUpperCase() as any,
          quantity: order.amount || 0,
          price: order.price || null,
          stopPrice: null,
          timeInForce: order.timeInForce || 'GTC',
          status: (order.status?.toUpperCase() || 'OPEN') as any,
          filledQuantity: order.filled || 0,
          idempotencyKey: '',
          createdAt: order.datetime ? new Date(order.datetime) : now,
          updatedAt: now,
        };
      });
    } catch (error: any) {
      this.logger.error(`getOpenOrders failed: ${error.message}`);
      return [];
    }
  }

  async getBalances(): Promise<Balance[]> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      const balance = await ex.fetchBalance();
      return Object.keys(balance.total || {}).map(asset => ({
        asset,
        free: String(balance.free?.[asset] || 0),
        locked: String(balance.used?.[asset] || 0),
      }));
    } catch (error: any) {
      this.logger.error(`getBalances failed: ${error.message}`);
      return [];
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      const positions = await ex.fetchPositions().catch(() => []);
      return positions.map((p: any) => ({
        symbol: p.symbol,
        side: (p.side?.toUpperCase() || 'BUY') as 'BUY' | 'SELL',
        quantity: p.contracts || p.amount || 0,
        entryPrice: p.entryPrice || 0,
        markPrice: p.markPrice || p.lastPrice || 0,
        unrealizedPnl: { amount: p.unrealizedPnl || 0, currency: 'USDT' } as any,
      }));
    } catch (error: any) {
      this.logger.error(`getPositions failed: ${error.message}`);
      return [];
    }
  }

  getAssetType(): 'crypto' | 'stock' | 'futures' | 'option' | 'dex' {
    return 'crypto';
  }

  supportsLeverage(): boolean {
    return false;
  }

  getSupportedOrderTypes(): Array<'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT'> {
    return ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'];
  }

  async testConnection(): Promise<boolean> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      await ex.fetchTime();
      return true;
    } catch (error: any) {
      this.logger.error(`testConnection failed: ${error.message}`);
      return false;
    }
  }

  async getExchangeInfo(): Promise<Record<string, unknown>> {
    try {
      const ex = this.getExchangeInstance('binance', false);
      const markets = await ex.fetchMarkets();
      return { markets, exchange: ex.id, has: ex.has };
    } catch (error: any) {
      this.logger.error(`getExchangeInfo failed: ${error.message}`);
      return {};
    }
  }

  // ── IExchangeAdapter legacy methods (kept for compatibility) ──

  async placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    try {
      const exchange = this.getExchangeInstance(params.exchange || 'binance', params.testnet ?? false);

      const orderType = params.type === 'MARKET' ? 'market' : 'limit';
      const side = params.side.toLowerCase();

      if (!params.testnet && process.env.ENABLE_LIVE_TRADING !== 'true') {
        this.logger.warn('Live trading is disabled. Set ENABLE_LIVE_TRADING=true to enable.');
        return { success: false, message: 'Live trading is currently disabled for safety.' };
      }

      const result = await exchange.createOrder(
        params.symbol,
        orderType,
        side,
        params.quantity,
        params.price,
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
      return balance.total?.USDT || balance.total || 0;
    } catch (error: any) {
      this.logger.error(`getBalance failed: ${error.message}`);
      return 0;
    }
  }

  async getPositionsLegacy(exchangeAccountId: string): Promise<any[]> {  // renamed to avoid conflict
    return this.getPositions() as any;
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

  async getOpenOrdersLegacy(exchangeAccountId: string, symbol?: string): Promise<any[]> {
    const trades = await this.getOpenOrders(symbol);
    return trades;
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
      return await ex.fetchOHLCV(symbol, timeframe, undefined, limit);
    } catch (error: any) {
      this.logger.error(`getOHLCV failed: ${error.message}`);
      return [];
    }
  }
}
