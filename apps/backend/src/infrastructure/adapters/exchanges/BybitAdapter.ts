// ── Bybit Trading Adapter ──
// Strictly follows Bybit Unified Trading API v5 documentation
// Official Docs: https://bybit-exchange.github.io/docs/v5/intro

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

function mapOrderType(type: OrderRequest['type']): string {
  const mapping: Record<string, string> = {
    MARKET: 'Market',
    LIMIT: 'Limit',
    STOP_LOSS: 'Market',
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
  }

  // ── Order Operations ──

  async createOrder(request: OrderRequest): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      category: 'spot',
      symbol: request.symbol,
      side: request.side === 'BUY' ? 'Buy' : 'Sell',
      orderType: mapOrderType(request.type),
      qty: request.quantity.toString(),
      orderLinkId: request.idempotencyKey,
      recvWindow: RECV_WINDOW,
    };

    if (request.price && request.type !== 'MARKET') {
      params.price = request.price.toString();
    }
    if (request.type === 'LIMIT') {
      params.timeInForce = mapTimeInForce(request.timeInForce);
    }
    if (request.stopPrice) {
      params.triggerPrice = request.stopPrice.toString();
      params.triggerBy = 'LastPrice';
    }

    try {
      const response = await this.signedRequest<BybitOrderResult>('POST', '/v5/order/create', params);
      const order = response.result;
      this.recordSuccess();

      return this.mapOrderToTrade(order, request.type);
    } catch (error) {
      this.recordFailure();
      throw this.handleBybitError(error, 'createOrder');
    }
  }

  async cancelOrder(request: CancelOrderRequest): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      category: 'spot',
      symbol: request.symbol,
      orderId: request.exchangeOrderId,
      recvWindow: RECV_WINDOW,
    };

    try {
      const response = await this.signedRequest<BybitOrderResult>('POST', '/v5/order/cancel', params);
      const order = response.result;
      this.recordSuccess();

      return this.mapOrderToTrade(order, 'MARKET');
    } catch (error) {
      this.recordFailure();
      throw this.handleBybitError(error, 'cancelOrder');
    }
  }

  async getOrder(exchangeOrderId: string, symbol: string): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      category: 'spot',
      symbol,
      orderId: exchangeOrderId,
      recvWindow: RECV_WINDOW,
    };

    try {
      const response = await this.signedRequest<BybitOrderResult>('GET', '/v5/order/realtime', params);
      return this.mapOrderToTrade(response.result);
    } catch (error) {
      throw this.handleBybitError(error, 'getOrder');
    }
  }

  async getOpenOrders(symbol?: string): Promise<Trade[]> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      category: 'spot',
      limit: '50',
      recvWindow: RECV_WINDOW,
    };
    if (symbol) params.symbol = symbol;

    try {
      const response = await this.signedRequest<{ list: BybitOrderResult[] }>('GET', '/v5/order/realtime', params);
      return (response.result.list ?? []).map((o) => this.mapOrderToTrade(o));
    } catch (error) {
      throw this.handleBybitError(error, 'getOpenOrders');
    }
  }

  async getBalances(): Promise<Balance[]> {
    this.checkCircuitBreaker();

    try {
      const response = await this.signedRequest<BybitBalanceResult>('GET', '/v5/account/wallet-balance', {
        accountType: 'UNIFIED',
        recvWindow: RECV_WINDOW,
      });

      const balances: Balance[] = [];
      for (const account of response.result.list) {
        for (const coin of account.coin) {
          if (parseFloat(coin.walletBalance) > 0) {
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
      throw this.handleBybitError(error, 'getBalances');
    }
  }

  async getPositions(): Promise<Position[]> {
    return [];
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v5/market/time`);
      if (!res.ok) return false;
      const data = (await res.json()) as BybitApiResponse;
      return data.retCode === 0;
    } catch {
      return false;
    }
  }

  async getExchangeInfo(): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/v5/market/instruments-info?category=spot`);
    return res.json();
  }

  getAssetType(): 'crypto' { return 'crypto'; }
  supportsLeverage(): boolean { return false; }
  getSupportedOrderTypes(): Array<'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT'> {
    return ['MARKET', 'LIMIT'];
  }

  // ── Signing (Official Bybit V5 format) ──
  private sign(timestamp: string, params: string): string {
    const signStr = `${timestamp}${this.apiKey}${RECV_WINDOW}${params}`;
    return crypto.createHmac('sha256', this.apiSecret).update(signStr).digest('hex');
  }

  // ── HTTP Helpers ──

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
      'Content-Type': method === 'GET' ? 'application/x-www-form-urlencoded' : 'application/json',
    };

    const url = method === 'GET' ? `${this.baseUrl}${path}?${queryString}` : `${this.baseUrl}${path}`;
    const body = method === 'POST' ? JSON.stringify(params) : undefined;

    const response = await fetch(url, {
      method,
      headers,
      ...(body ? { body } : {}),
    });

    const data = (await response.json()) as BybitApiResponse<T>;

    if (data.retCode !== 0) {
      const errorMsg = `Bybit API Error [${data.retCode}]: ${data.retMsg}`;
      logger.error({ retCode: data.retCode, retMsg: data.retMsg, path }, errorMsg);

      // Map common error codes
      if (data.retCode === 10003) throw new Error('Bybit: Insufficient permissions');
      if (data.retCode === 10004) throw new Error('Bybit: Invalid signature');
      if (data.retCode === 10006) throw new Error('Bybit: Rate limit exceeded');
      if (data.retCode === 110003) throw new Error('Bybit: Insufficient balance');
      if (data.retCode === 110005) throw new Error('Bybit: Invalid quantity');

      throw new Error(errorMsg);
    }

    return data;
  }

  private handleBybitError(error: unknown, operation: string): InfraError {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new InfraError(`Bybit ${operation} failed: ${message}`, `BYBIT_${operation.toUpperCase()}_FAILED`);
  }

  private mapOrderToTrade(order: BybitOrderResult, requestType?: OrderRequest['type']): Trade {
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

  // ── Circuit Breaker ──

  private checkCircuitBreaker(): void {
    if (this._circuitOpen) {
      const elapsed = Date.now() - this._lastFailureTime;
      if (elapsed < this._resetTimeoutMs) {
        throw new InfraError(
          `[${this.exchangeName}] Circuit breaker open — retry after ${Math.ceil((this._resetTimeoutMs - elapsed) / 1000)}s`,
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
      logger.warn(`[${this.exchangeName}] Circuit breaker opened`);
    }
  }

  private recordSuccess(): void {
    if (this._failureCount > 0) {
      this._failureCount = 0;
      if (this._circuitOpen) {
        this._circuitOpen = false;
        logger.info(`[${this.exchangeName}] Circuit breaker reset`);
      }
    }
  }
}
