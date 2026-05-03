// ── Bybit Trading Adapter (Real Implementation) ──
// Implements Bybit Unified Trading API v5 with HMAC SHA256 signing.
// Docs: https://bybit-exchange.github.io/docs/v5/guide

import crypto from 'node:crypto';
import { BaseTradingAdapter, type OrderRequest, type Balance, type Position, type CancelOrderRequest } from './BaseTradingAdapter';
import type { Trade } from '../../../domain/entities/Trade';
import { InfraError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';

export interface BybitAdapterConfig {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}

const BYBIT_BASE = 'https://api.bybit.com';
const BYBIT_TESTNET = 'https://api-testnet.bybit.com';
const RECV_WINDOW = '5000';

// ── Bybit v5 Response Types ──

interface BybitApiResponse<T = unknown> {
  retCode: number;
  retMsg: string;
  result: T;
  time: number;
}

interface BybitOrderResult {
  orderId: string;
  orderLinkId: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  price: string;
  qty: string;
  cumExecQty: string;
  orderStatus: string;
  avgPrice: string;
  createdTime: string;
  updatedTime: string;
}

interface BybitBalanceResult {
  list: Array<{
    coin: Array<{
      coin: string;
      walletBalance: string;
      availableToWithdraw: string;
      equity: string;
      usdValue: string;
    }>;
  }>;
}

// ── Order Type Mapping ──

function mapOrderType(type: OrderRequest['type']): string {
  const mapping: Record<string, string> = {
    MARKET: 'Market',
    LIMIT: 'Limit',
    STOP_LOSS: 'Market', // Bybit spot uses conditional orders separately
    STOP_LOSS_LIMIT: 'Limit',
    TAKE_PROFIT: 'Market',
    TAKE_PROFIT_LIMIT: 'Limit',
  };
  return mapping[type] ?? type;
}

function mapTimeInForce(tif: OrderRequest['timeInForce']): string {
  const mapping: Record<string, string> = {
    GTC: 'GTC',
    IOC: 'IOC',
    FOK: 'FOK',
  };
  return mapping[tif ?? 'GTC'] ?? 'GTC';
}

const ORDER_STATUS_MAP: Record<string, Trade['status']> = {
  Created: 'PENDING',
  New: 'PENDING',
  PartiallyFilled: 'PARTIALLY_FILLED',
  PartiallyFilledCanceled: 'PARTIALLY_FILLED',
  Filled: 'FILLED',
  Cancelled: 'CANCELLED',
  Rejected: 'REJECTED',
  Deactivated: 'EXPIRED',
};

export class BybitAdapter extends BaseTradingAdapter {
  public readonly exchangeName = 'BYBIT';
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  // Circuit breaker
  private _failureCount = 0;
  private _lastFailureTime = 0;
  private _circuitOpen = false;
  private readonly _failureThreshold = 5;
  private readonly _resetTimeoutMs = 30_000;

  constructor(config: BybitAdapterConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.testnet ? BYBIT_TESTNET : BYBIT_BASE;
    // Touch fields to suppress TS6133 in skeleton phase
    void this._failureThreshold;
    void this._failureCount;
  }

  // ══════════════════════════════════════════════════
  // Order Operations
  // ══════════════════════════════════════════════════

  async createOrder(request: OrderRequest): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      category: 'spot',
      symbol: request.symbol,
      side: request.side === 'BUY' ? 'Buy' : 'Sell',
      orderType: mapOrderType(request.type),
      qty: request.quantity.toString(),
      orderLinkId: request.idempotencyKey,
    };

    // Price: required for LIMIT orders
    if (request.price && request.type !== 'MARKET') {
      params.price = request.price.toString();
    }

    // Time in force: only applicable to LIMIT orders
    if (request.type === 'LIMIT') {
      params.timeInForce = mapTimeInForce(request.timeInForce);
    }

    // Trigger price for stop/take-profit orders
    // Note: Bybit spot uses TradingView trigger for conditional orders
    // For MVP, we place regular orders; conditional logic handled by separate endpoint
    if (request.stopPrice) {
      params.triggerPrice = request.stopPrice.toString();
      params.triggerBy = 'LastPrice';
    }

    try {
      const response = await this.signedRequest<BybitOrderResult>(
        'POST',
        '/v5/order/create',
        params,
      );

      const order = response.result;
      this.recordSuccess();

      return {
        id: order.orderLinkId || crypto.randomUUID(),
        exchangeOrderId: order.orderId,
        exchangeAccountId: '',
        symbol: order.symbol,
        side: order.side === 'Buy' ? 'BUY' : 'SELL',
        type: request.type,
        quantity: parseFloat(order.qty),
        price: order.price ? parseFloat(order.price) : null,
        stopPrice: request.stopPrice ?? null,
        timeInForce: request.timeInForce ?? 'GTC',
        status: ORDER_STATUS_MAP[order.orderStatus] ?? 'PENDING',
        filledQuantity: parseFloat(order.cumExecQty),
        idempotencyKey: request.idempotencyKey,
        createdAt: new Date(parseInt(order.createdTime)),
        updatedAt: new Date(parseInt(order.updatedTime)),
      };
    } catch (error) {
      this.recordFailure();
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: msg, symbol: request.symbol }, 'Bybit createOrder failed');
      throw new InfraError(`Bybit order failed: ${msg}`, 'BYBIT_ORDER_FAILED');
    }
  }

  async cancelOrder(request: CancelOrderRequest): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      category: 'spot',
      symbol: request.symbol,
      orderId: request.exchangeOrderId,
    };

    try {
      const response = await this.signedRequest<BybitOrderResult>(
        'POST',
        '/v5/order/cancel',
        params,
      );

      const order = response.result;
      this.recordSuccess();

      return {
        id: order.orderLinkId || crypto.randomUUID(),
        exchangeOrderId: order.orderId,
        exchangeAccountId: '',
        symbol: order.symbol,
        side: order.side === 'Buy' ? 'BUY' : 'SELL',
        type: order.orderType === 'Market' ? 'MARKET' : 'LIMIT',
        quantity: parseFloat(order.qty),
        price: order.price ? parseFloat(order.price) : null,
        stopPrice: null,
        timeInForce: 'GTC',
        status: 'CANCELLED',
        filledQuantity: parseFloat(order.cumExecQty),
        idempotencyKey: order.orderLinkId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.recordFailure();
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InfraError(`Bybit cancel failed: ${msg}`, 'BYBIT_CANCEL_FAILED');
    }
  }

  async getOrder(exchangeOrderId: string, symbol: string): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      category: 'spot',
      symbol,
      orderId: exchangeOrderId,
    };

    try {
      const response = await this.signedRequest<BybitOrderResult>(
        'GET',
        '/v5/order/realtime',
        params,
      );

      return this.mapOrderToTrade(response.result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InfraError(`Bybit getOrder failed: ${msg}`, 'BYBIT_GET_ORDER_FAILED');
    }
  }

  async getOpenOrders(symbol?: string): Promise<Trade[]> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      category: 'spot',
      limit: '50',
    };
    if (symbol) params.symbol = symbol;

    try {
      const response = await this.signedRequest<{ list: BybitOrderResult[] }>(
        'GET',
        '/v5/order/realtime',
        params,
      );

      const orders = response.result.list ?? [];
      return orders.map((o) => this.mapOrderToTrade(o));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InfraError(`Bybit getOpenOrders failed: ${msg}`, 'BYBIT_OPEN_ORDERS_FAILED');
    }
  }

  // ══════════════════════════════════════════════════
  // Balance & Position
  // ══════════════════════════════════════════════════

  async getBalances(): Promise<Balance[]> {
    this.checkCircuitBreaker();

    try {
      const response = await this.signedRequest<BybitBalanceResult>(
        'GET',
        '/v5/account/wallet-balance',
        { accountType: 'UNIFIED' },
      );

      const balances: Balance[] = [];
      for (const account of response.result.list) {
        for (const coin of account.coin) {
          const walletBalance = parseFloat(coin.walletBalance);
          if (walletBalance > 0) {
            balances.push({
              asset: coin.coin,
              free: coin.availableToWithdraw,
              locked: (parseFloat(coin.equity) - parseFloat(coin.availableToWithdraw)).toString(),
            });
          }
        }
      }
      this.recordSuccess();
      return balances;
    } catch (error) {
      this.recordFailure();
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InfraError(`Bybit getBalances failed: ${msg}`, 'BYBIT_BALANCE_FAILED');
    }
  }

  async getPositions(): Promise<Position[]> {
    // Spot: positions are non-zero balances; return empty for derivatives MVP
    return [];
  }

  // ══════════════════════════════════════════════════
  // Connectivity
  // ══════════════════════════════════════════════════

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v5/market/time`);
      if (!response.ok) return false;
      const data = (await response.json()) as BybitApiResponse;
      return data.retCode === 0;
    } catch {
      return false;
    }
  }

  async getExchangeInfo(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/v5/market/instruments-info?category=spot`);
    return response.json() as Promise<Record<string, unknown>>;
  }

  // ── Asset Info ──
  getAssetType(): 'crypto' { return 'crypto'; }
  supportsLeverage(): boolean { return false; }
  getSupportedOrderTypes(): Array<'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT'> {
    return ['MARKET', 'LIMIT'];
  }

  // ══════════════════════════════════════════════════
  // HMAC SHA256 Signing (Bybit v5)
  // ══════════════════════════════════════════════════
  //
  // Bybit signature format:
  //   signature = HMAC_SHA256(timestamp + apiKey + recvWindow + queryString, apiSecret)
  //
  // Headers required:
  //   X-BAPI-API-KEY: apiKey
  //   X-BAPI-TIMESTAMP: timestamp (ms)
  //   X-BAPI-SIGN: signature
  //   X-BAPI-RECV-WINDOW: recvWindow (ms, default 5000)

  private sign(timestamp: string, params: string): string {
    const signStr = `${timestamp}${this.apiKey}${RECV_WINDOW}${params}`;
    return crypto.createHmac('sha256', this.apiSecret).update(signStr).digest('hex');
  }

  // ══════════════════════════════════════════════════
  // HTTP Helpers
  // ══════════════════════════════════════════════════

  private async signedRequest<T>(
    method: 'GET' | 'POST',
    path: string,
    params: Record<string, string>,
  ): Promise<BybitApiResponse<T>> {
    const timestamp = Date.now().toString();
    const queryString = new URLSearchParams(params).toString();

    const signature = this.sign(timestamp, queryString);

    const headers: Record<string, string> = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': signature,
      'X-BAPI-RECV-WINDOW': RECV_WINDOW,
      'Content-Type': 'application/json',
    };

    let url = `${this.baseUrl}${path}`;
    let body: string | undefined;

    if (method === 'GET') {
      url += `?${queryString}`;
    } else {
      body = JSON.stringify(params);
    }

    const response = await fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
    });

    const data = (await response.json()) as BybitApiResponse<T>;

    if (data.retCode !== 0) {
      const msg = `Bybit API error [${data.retCode}]: ${data.retMsg}`;
      logger.error({ retCode: data.retCode, retMsg: data.retMsg, path }, msg);

      // Specific error codes
      if (data.retCode === 10001) throw new Error('Bybit internal error');
      if (data.retCode === 10002) throw new Error('Bybit authorization expired');
      if (data.retCode === 10003) throw new Error('Insufficient permissions');
      if (data.retCode === 10004) throw new Error('Invalid sign');
      if (data.retCode === 10006) throw new Error('Too many requests — rate limited');
      if (data.retCode === 110001) throw new Error('Order does not exist');
      if (data.retCode === 110003) throw new Error('Insufficient balance');
      if (data.retCode === 110004) throw new Error('Price too high/low');
      if (data.retCode === 110005) throw new Error('Quantity too high/low');
      if (data.retCode === 130021) throw new Error('OrderLinkId already exists');

      throw new Error(msg);
    }

    return data;
  }

  // ══════════════════════════════════════════════════
  // Order Mapping Helper
  // ══════════════════════════════════════════════════

  private mapOrderToTrade(
    order: BybitOrderResult,
    requestType?: OrderRequest['type'],
  ): Trade {
    return {
      id: order.orderLinkId || crypto.randomUUID(),
      exchangeOrderId: order.orderId,
      exchangeAccountId: '',
      symbol: order.symbol,
      side: order.side === 'Buy' ? 'BUY' : 'SELL',
      type: requestType ?? (order.orderType === 'Market' ? 'MARKET' : 'LIMIT'),
      quantity: parseFloat(order.qty),
      price: order.price ? parseFloat(order.price) : null,
      stopPrice: null,
      timeInForce: 'GTC',
      status: ORDER_STATUS_MAP[order.orderStatus] ?? 'PENDING',
      filledQuantity: parseFloat(order.cumExecQty),
      idempotencyKey: order.orderLinkId,
      createdAt: new Date(parseInt(order.createdTime)),
      updatedAt: new Date(parseInt(order.updatedTime)),
    };
  }

  // ══════════════════════════════════════════════════
  // Circuit Breaker
  // ══════════════════════════════════════════════════

  private checkCircuitBreaker(): void {
    if (this._circuitOpen) {
      const elapsed = Date.now() - this._lastFailureTime;
      if (elapsed < this._resetTimeoutMs) {
        const remaining = Math.ceil((this._resetTimeoutMs - elapsed) / 1000);
        throw new InfraError(
          `[BYBIT] Circuit breaker open — retry after ${remaining}s`,
          'CIRCUIT_BREAKER_OPEN',
        );
      }
      this._circuitOpen = false;
      this._failureCount = 0;
    }
  }

  private recordFailure(): void {
    this._failureCount++;
    this._lastFailureTime = Date.now();
    if (this._failureCount >= this._failureThreshold) {
      this._circuitOpen = true;
      logger.warn('[BYBIT] Circuit breaker opened');
    }
  }

  private recordSuccess(): void {
    if (this._failureCount > 0) {
      this._failureCount = 0;
      if (this._circuitOpen) {
        this._circuitOpen = false;
        logger.info('[BYBIT] Circuit breaker reset');
      }
    }
  }
}
