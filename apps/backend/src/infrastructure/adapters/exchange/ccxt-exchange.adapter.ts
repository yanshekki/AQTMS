import { Injectable, Logger } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { IExchangeAdapter, PlaceOrderParams, PlaceOrderResult, OrderStatusResult } from './exchange.adapter.interface';
import { BaseTradingAdapter, OrderRequest, CancelOrderRequest, Balance, Position } from '../exchanges/BaseTradingAdapter';
import type { Trade } from '../../../domain/entities/Trade';

interface ExchangeConfig {
  exchange: string;
  apiKey: string;
  apiSecret?: string;
  password?: string;       // For some exchanges (e.g. OKX)
  passphrase?: string;     // For some exchanges (e.g. Coinbase)
  uid?: string;
  testnet?: boolean;
  options?: Record<string, any>; // Extra CCXT options
  enableRateLimit?: boolean;
  features?: Record<string, boolean>; // Per-exchange feature flags (e.g. { stopLoss: true, takeProfit: true, leverage: false })
}

@Injectable()
/**
 * CCXT-based exchange adapter providing unified access to 100+ cryptocurrency exchanges.
 * Implements both BaseTradingAdapter (domain) and IExchangeAdapter (infrastructure) contracts.
 *
 * Features:
 * - Automatic initialization caching per exchange + testnet/mainnet
 * - Production-grade error handling with rate limit, auth, and network categorization
 * - Graceful degradation on initialization failures
 * - Consistent safe return values for read operations on error
 */
export class CcxtExchangeAdapter extends BaseTradingAdapter implements IExchangeAdapter {
  public readonly exchangeName = 'CCXT';
  private readonly logger = new Logger(CcxtExchangeAdapter.name);
  private exchangeInstances: Map<string, any> = new Map();
  private defaultExchange = 'binance';
  private defaultTestnet = false;

  /**
   * Sets the default exchange used by methods that do not accept an explicit exchange parameter.
   * @param exchange - Exchange identifier (e.g., 'binance', 'bybit', 'okx')
   */
  setDefaultExchange(exchange: string): void {
    this.defaultExchange = exchange.toLowerCase();
    this.logger.log(`Default exchange set to ${this.defaultExchange}`);
  }

  async initialize(config: ExchangeConfig): Promise<void> {
    if (!config || typeof config.exchange !== 'string' || !config.exchange.trim()) {
      throw new Error('Invalid configuration: exchange name is required and must be a non-empty string');
    }
    const start = Date.now();
    const exchangeName = config.exchange.trim().toLowerCase();
    const cacheKey = `${exchangeName}-${config.testnet ? 'testnet' : 'mainnet'}`;

    if (this.exchangeInstances.has(cacheKey)) {
      this.logger.log(`Exchange ${exchangeName} already initialized (cache hit)`);
      return;
    }

    // Basic validation and logging (never log actual credentials)
    const maskedKey = config.apiKey ? `${config.apiKey.slice(0, 4)}...${config.apiKey.slice(-4)}` : 'none';
    if (!config.apiKey) {
      this.logger.warn(`Initializing ${exchangeName} without API key - limited functionality`);
    } else {
      this.logger.log(`Initializing ${exchangeName} with API key: ${maskedKey}`);
    }
    if (!config.apiSecret) {
      this.logger.warn(`Initializing ${exchangeName} without API secret`);
    }

    const commonOptions: any = {
      apiKey: config.apiKey,
      secret: config.apiSecret,
      password: config.password,
      passphrase: config.passphrase,
      uid: config.uid,
      enableRateLimit: config.enableRateLimit ?? true,
      sandbox: config.testnet ?? false,
      options: {
        defaultType: 'spot',
        ...(config.options || {}),
      },
    };

    let exchange: any;

    try {
      const ExchangeClass = (ccxt as any)[exchangeName];
      if (typeof ExchangeClass === 'function') {
        exchange = new ExchangeClass(commonOptions);

        // Rate limit logging for production observability
        const rateLimitEnabled = commonOptions.enableRateLimit;
        const rateLimitMs = (exchange as any).rateLimit || 'default';
        this.logger.log(
          `${exchangeName} initialized with rateLimit=${rateLimitEnabled} (${rateLimitMs}ms between requests)`,
        );

        // Production readiness: async connectivity verification (non-blocking)
        // MethodMaster: better error handling with CCXT error categorization for fetchTime failures
        exchange
          .fetchTime()
          .then(() => this.logger.log(`${exchangeName} connectivity verified`))
          .catch((e: any) => {
            const msg = e?.message || String(e);
            if (e instanceof ccxt.NetworkError || msg.toLowerCase().includes('network') || msg.includes('timeout') || msg.includes('ECONNRESET')) {
              this.logger.warn(`[NETWORK] ${exchangeName} connectivity check failed: ${msg}`);
            } else if (e instanceof ccxt.AuthenticationError || msg.toLowerCase().includes('apikey') || msg.toLowerCase().includes('authentication')) {
              this.logger.warn(`[CREDENTIALS] ${exchangeName} connectivity check failed: ${msg}`);
            } else if (e instanceof ccxt.RateLimitExceeded || msg.toLowerCase().includes('rate limit')) {
              this.logger.warn(`[RATE LIMIT] ${exchangeName} connectivity check failed: ${msg}`);
            } else {
              this.logger.warn(`${exchangeName} connectivity check failed: ${msg}`);
            }
          });
      } else {
        throw new Error(`Exchange class not found for: ${config.exchange}`);
      }
    } catch (err: any) {
      const duration = Date.now() - start;
      this.logger.error(
        `Failed to initialize ${exchangeName} after ${duration}ms: ${err.message}`,
        err.stack,
      );
      // Graceful degradation: do not throw for transient errors (network/creds), only for unsupported exchange
      if (err.message.includes('not found')) {
        throw new Error(
          `Unsupported exchange: '${config.exchange}'. '${exchangeName}' is not a valid CCXT exchange class. ` +
          `Supported examples: binance, bybit, okx, coinbase, kraken, kucoin, huobi, gateio, mexc, etc. ` +
          `Check full list with: const ccxt = require('ccxt'); console.log(ccxt.exchanges);`,
        );
      }
      this.logger.warn(`Continuing in degraded mode for ${exchangeName} (init failed)`);
      return;
    }

    this.exchangeInstances.set(cacheKey, exchange);
    const duration = Date.now() - start;
    this.logger.log(
      `Successfully initialized ${exchangeName} adapter (testnet=${!!config.testnet}) in ${duration}ms`,
    );
  }

  private getExchangeInstance(exchangeName: string, testnet?: boolean): any {
    const effectiveTestnet = testnet ?? this.defaultTestnet;
    const cacheKey = `${exchangeName.toLowerCase()}-${effectiveTestnet ? 'testnet' : 'mainnet'}`;
    const instance = this.exchangeInstances.get(cacheKey);

    if (!instance) {
      const availableKeys = Array.from(this.exchangeInstances.keys()).join(', ') || 'none';
      this.logger.error(
        `Exchange ${exchangeName} not initialized (cacheKey=${cacheKey}, effectiveTestnet=${effectiveTestnet}). Available initialized exchanges: [${availableKeys}]. Call initialize() first.`,
      );
      throw new Error(`Exchange ${exchangeName} not initialized. Call initialize() first.`);
    }
    return instance;
  }

  // ── BaseTradingAdapter implementations ──

  async createOrder(request: OrderRequest): Promise<Trade> {
    try {
      if (!request || !request.symbol || !request.side || !request.type || !request.quantity || request.quantity <= 0) {
        throw new Error('Invalid order request: symbol, side, type and positive quantity are required');
      }
      const ex = this.getExchangeInstance(this.defaultExchange);

      // Production refinement: properly support SL/TP/stop orders via CCXT params
      const orderParams: any = {
        timeInForce: request.timeInForce || 'GTC',
      };
      if (request.stopPrice) {
        orderParams.stopPrice = request.stopPrice;
      }
      if (['STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'].includes(request.type)) {
        // CCXT unified stop order handling
        orderParams.stopPrice = request.stopPrice || request.price;
      }

      const order = await ex.createOrder(
        request.symbol,
        request.type.toLowerCase().replace('_', '-'), // e.g. stop_loss
        request.side.toLowerCase(),
        request.quantity,
        request.price,
        Object.keys(orderParams).length > 0 ? orderParams : undefined,
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
      this.handleCcxtError(error, 'createOrder');
    }
  }

  async cancelOrder(request: CancelOrderRequest): Promise<Trade> {
    try {
      const ex = this.getExchangeInstance(this.defaultExchange);
      await ex.cancelOrder(request.exchangeOrderId, request.symbol);

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
      this.handleCcxtError(error, 'cancelOrder');
    }
  }

  async getOrder(exchangeOrderId: string, symbol: string): Promise<Trade> {
    try {
      const ex = this.getExchangeInstance(this.defaultExchange, false);
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
      this.handleCcxtError(error, 'getOrder');
    }
  }

  async getOpenOrders(symbol?: string): Promise<Trade[]> {
    try {
      const ex = this.getExchangeInstance(this.defaultExchange, false);
      const orders = await ex.fetchOpenOrders(symbol).catch((err) => {
        this.logger?.warn?.(`fetchOpenOrders failed: ${err?.message || err}`);
        return [];
      });
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
      const ex = this.getExchangeInstance(this.defaultExchange, false);
      const balance = await ex.fetchBalance().catch(() => ({ total: {}, free: {}, used: {} }));
      const assets = Object.keys(balance.total || {});
      if (assets.length === 0) {
        this.logger.warn(`getBalances returned no assets for ${this.defaultExchange}`);
        return [];
      }
      return assets.map(asset => ({
        asset,
        free: String(balance.free?.[asset] ?? balance.total?.[asset] ?? 0),
        locked: String(balance.used?.[asset] ?? 0),
      }));
    } catch (error: any) {
      this.logger.error(`getBalances failed: ${error.message}`);
      return [];
    }
  }
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const ex = this.getExchangeInstance(this.defaultExchange, false);
      const positions = await ex.fetchPositions().catch(() => []);
      const validPositions = (positions || []).filter((p: any) => p && (p.contracts || p.amount || p.size));
      return validPositions.map((p: any) => ({
        symbol: p.symbol || p.info?.symbol || "UNKNOWN",
        side: (p.side?.toUpperCase() || (p.contracts > 0 || p.amount > 0 ? "BUY" : "SELL")) as "BUY" | "SELL",
        quantity: Math.abs(p.contracts || p.amount || p.size || 0),
        entryPrice: p.entryPrice || p.entry_price || 0,
        markPrice: p.markPrice || p.mark_price || p.lastPrice || 0,
        unrealizedPnl: { amount: p.unrealizedPnl || p.unrealized_pnl || 0, currency: "USDT" } as any,
      }));
    } catch (error: any) {
      this.logger.error(`getPositions failed: ${error.message}`);
      return [];
    }
  }
    }
  }

  // ── IExchangeAdapter overloads / additional implementations for interface compatibility ──
  async getPositions(exchangeAccountId: string): Promise<any[]> {
    try {
      const ex = this.getExchangeInstance(this.defaultExchange, false);
      const positions = await ex.fetchPositions().catch(() => []);
      return (positions || []).filter((p: any) => p && (p.contracts || p.amount)).map((p: any) => ({
        accountId: exchangeAccountId,
        symbol: p.symbol,
        side: p.side?.toUpperCase() || "BUY",
        quantity: p.contracts || p.amount || 0,
        entryPrice: p.entryPrice || 0,
        unrealizedPnl: p.unrealizedPnl || 0,
      }));
    } catch (error: any) {
      this.logger.error(`getPositions(${exchangeAccountId}) failed: ${error.message}`);
      return [];
    }
  }
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

  async testConnection(exchangeName?: string, testnet = false): Promise<boolean> {
    try {
      const exName = exchangeName || this.defaultExchange;
      const ex = this.getExchangeInstance(exName, testnet);
      await ex.fetchTime();
      return true;
    } catch (error: any) {
      this.logger.error(`testConnection failed: ${error.message}`);
      return false;
    }
  }

  async getExchangeInfo(exchangeName?: string, testnet = false): Promise<Record<string, unknown>> {
    try {
      const exName = exchangeName || this.defaultExchange;
      const ex = this.getExchangeInstance(exName, testnet);
      const markets = await ex.fetchMarkets();
      return { markets, exchange: ex.id, has: ex.has };
    } catch (error: any) {
      this.logger.error(`getExchangeInfo failed: ${error.message}`);
      return {};
    }
  }

  // ── IExchangeAdapter methods (non-conflicting names only) ──

  async placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    try {
      if (!params || !params.symbol || !params.side || !params.type || !params.quantity || params.quantity <= 0) {
        return { success: false, message: 'Invalid order parameters: symbol, side, type and positive quantity are required' };
      }
      // Symbol validation (MethodMaster requirement)
      const symbol = typeof params.symbol === 'string' ? params.symbol.trim().toUpperCase() : '';
      if (!symbol || !/^[A-Z0-9._-]+\/[A-Z0-9._-]+$/.test(symbol)) {
        return { success: false, message: 'Invalid symbol: must be non-empty string in format BASE/QUOTE (e.g. BTC/USDT)' };
      }

      const exchangeName = params.exchange || this.defaultExchange;
      const exchange = this.getExchangeInstance(exchangeName, params.testnet ?? false);

      // Map order type, supporting advanced stop orders
      let orderType = params.type === 'MARKET' ? 'market' : params.type === 'LIMIT' ? 'limit' : params.type.toLowerCase().replace('_', '-');
      const side = params.side.toLowerCase();

      // Live trading safety guard (unchanged behavior)
      if (!params.testnet && (typeof process !== 'undefined' ? process.env.ENABLE_LIVE_TRADING : '') !== 'true') {
        this.logger.warn('Live trading is disabled. Set ENABLE_LIVE_TRADING=true to enable.');
        return { success: false, message: 'Live trading is currently disabled for safety.' };
      }

      // Build params for SL/TP/stop orders (robustness improvement)
      const orderParams: any = {};
      if (params.stopLoss) {
        orderParams.stopPrice = params.stopLoss;
        if (!['stop-loss', 'stop_loss_limit'].includes(orderType)) orderType = 'stop-loss';
      }
      if (params.takeProfit) {
        orderParams.stopPrice = params.takeProfit;
        if (!['take-profit'].includes(orderType)) orderType = 'take-profit';
      }

      const result = await exchange.createOrder(
        params.symbol,
        orderType,
        side,
        params.quantity,
        params.price,
        Object.keys(orderParams).length > 0 ? orderParams : undefined,
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
      this.logger.error(`placeOrder failed on ${params?.exchange || this.defaultExchange}: ${error.message}`);
      try {
        this.handleCcxtError(error, 'placeOrder', params?.exchange || this.defaultExchange);
      } catch (handledErr: any) {
        return { success: false, message: handledErr.message };
      }
      return { success: false, message: error.message };
    }
  }
  async getBalance(exchangeAccountId: string): Promise<number> {
    try {
      const ex = this.getExchangeInstance(this.defaultExchange, false);
      const balance = await ex.fetchBalance();
      return balance.total?.USDT || 0;
    } catch (error: any) {
      this.logger.error(`getBalance failed: ${error.message}`);
      return 0;
    }
  }

  async getOrderStatus(exchangeAccountId: string, exchangeOrderId: string): Promise<OrderStatusResult | null> {
    try {
      const ex = this.getExchangeInstance(this.defaultExchange, false);
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
      this.handleCcxtError(error, 'getOHLCV', exchange);
      return [];
    }
  }

  /**
   * Production-grade CCXT error handler with enhanced messages, credential security notes, and rate limit logging.
   */
  private handleCcxtError(error: any, operation: string, exchangeName = this.defaultExchange): never | void {
    const msg = error?.message || String(error);

    // Rate limit specific logging and messaging
    if (error instanceof ccxt.RateLimitExceeded || msg.toLowerCase().includes('rate limit') || msg.includes('RateLimit')) {
      this.logger.warn(`[RATE LIMIT] ${exchangeName} ${operation}: ${msg}. Consider increasing enableRateLimit or adding delays.`);
      throw new Error(`Rate limit exceeded on ${exchangeName}. Please retry after a short delay or enable stricter rate limiting.`);
    }

    // Common CCXT authentication / credential errors (improved security handling)
    if (
      error instanceof ccxt.AuthenticationError ||
      msg.toLowerCase().includes('apikey') ||
      msg.toLowerCase().includes('invalid api') ||
      msg.toLowerCase().includes('authentication') ||
      msg.toLowerCase().includes('credential')
    ) {
      this.logger.error(`[CREDENTIALS] Authentication failed for ${exchangeName} during ${operation}. Use masked key verification.`);
      throw new Error(`Invalid or insufficient API credentials for ${exchangeName}. Verify keys have trading permissions and are not expired.`);
    }

    // Network / exchange errors
    if (error instanceof ccxt.NetworkError || msg.toLowerCase().includes('network') || msg.includes('timeout') || msg.includes('ECONNRESET')) {
      this.logger.warn(`[NETWORK] ${exchangeName} ${operation} network issue: ${msg}`);
      throw new Error(`Network error connecting to ${exchangeName}. Check connectivity and exchange status.`);
    }

    // Order / insufficient funds etc.
    if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
      throw new Error(`Insufficient balance or funds for ${operation} on ${exchangeName}.`);
    }

    if (msg.toLowerCase().includes('invalid order') || msg.toLowerCase().includes('order not found')) {
      throw new Error(`Order error on ${exchangeName}: ${msg}`);
    }

    // Better handling for unknown / unclassified CCXT error types (MethodMaster)
    // Covers other CCXT subclasses (ExchangeError, DDoSProtection, InvalidNonce, etc.)
    // or any error whose constructor name indicates a CCXT origin.
    const isCcxtError =
      error instanceof (ccxt as any).BaseError ||
      (error && typeof error.constructor?.name === 'string' && error.constructor.name.endsWith('Error'));
    if (isCcxtError) {
      const errorType = error?.constructor?.name || 'UnknownCCXTError';
      this.logger.error(`[CCXT ${errorType}] ${exchangeName} ${operation}: ${msg}`);
      throw new Error(`[${errorType}] ${operation} failed on ${exchangeName}: ${msg}`);
    }

    // Fallback to base or generic enhanced message
    this.logger.error(`CCXT error in ${operation} on ${exchangeName}: ${msg}`, error?.stack);
    throw new Error(`[${this.exchangeName}] ${operation} failed on ${exchangeName}: ${msg}`);
  }
}
