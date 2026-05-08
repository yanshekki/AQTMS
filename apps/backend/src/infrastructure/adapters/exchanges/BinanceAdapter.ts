// ── Binance Trading Adapter ──
// Strictly follows Binance Spot API v3 documentation

import crypto from 'node:crypto';
import { BaseTradingAdapter, type OrderRequest, type Balance, type Position, type CancelOrderRequest } from './BaseTradingAdapter';
import type { Trade } from '../../../domain/entities/Trade';
import { InfraError } from '../../../shared/errors';

export interface BinanceAdapterConfig {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}

const BINANCE_BASE = 'https://api.binance.com';
const BINANCE_TESTNET = 'https://testnet.binance.vision';

interface BinanceOrderResponse {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  type: string;
  side: string;
}

interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

interface BinanceError {
  code: number;
  msg: string;
}

export class BinanceAdapter extends BaseTradingAdapter {
  public readonly exchangeName = 'BINANCE';
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  private readonly recvWindow = 5000;

  private _failureCount = 0;
  private _lastFailureTime = 0;
  private _circuitOpen = false;
  private readonly _failureThreshold = 5;
  private readonly _resetTimeoutMs = 30_000;

  constructor(config: BinanceAdapterConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.testnet ? BINANCE_TESTNET : BINANCE_BASE;
  }

  // ── Order Operations ──

  async createOrder(request: OrderRequest): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.quantity.toString(),
      newClientOrderId: request.idempotencyKey,
      timestamp: Date.now().toString(),
      recvWindow: this.recvWindow.toString(),
    };

    if (request.price && request.type !== 'MARKET') {
      params.price = request.price.toString();
    }
    if (request.stopPrice && ['STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'].includes(request.type)) {
      params.stopPrice = request.stopPrice.toString();
    }
    if (request.timeInForce && request.type === 'LIMIT') {
      params.timeInForce = request.timeInForce;
    }

    params.signature = this.sign(params);

    try {
      const response = await this.privatePost('/api/v3/order', params);
      const order = response as BinanceOrderResponse;

      this.recordSuccess();
      return this.mapOrderToTrade(order, request);
    } catch (error) {
      this.recordFailure();
      throw this.handleBinanceError(error, 'createOrder');
    }
  }

  async cancelOrder(request: CancelOrderRequest): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      symbol: request.symbol,
      orderId: request.exchangeOrderId,
      timestamp: Date.now().toString(),
      recvWindow: this.recvWindow.toString(),
    };
    params.signature = this.sign(params);

    try {
      const response = await this.privateDelete('/api/v3/order', params);
      const order = response as BinanceOrderResponse;

      this.recordSuccess();
      return this.mapOrderToTrade(order, { type: 'MARKET' } as any);
    } catch (error) {
      this.recordFailure();
      throw this.handleBinanceError(error, 'cancelOrder');
    }
  }

  async getOrder(exchangeOrderId: string, symbol: string): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      symbol,
      orderId: exchangeOrderId,
      timestamp: Date.now().toString(),
      recvWindow: this.recvWindow.toString(),
    };
    params.signature = this.sign(params);

    try {
      const response = await this.privateGet('/api/v3/order', params);
      const order = response as BinanceOrderResponse;
      return this.mapOrderToTrade(order, { type: 'MARKET' } as any);
    } catch (error) {
      throw this.handleBinanceError(error, 'getOrder');
    }
  }

  async getOpenOrders(symbol?: string): Promise<Trade[]> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      timestamp: Date.now().toString(),
      recvWindow: this.recvWindow.toString(),
    };
    if (symbol) params.symbol = symbol;
    params.signature = this.sign(params);

    try {
      const response = await this.privateGet('/api/v3/openOrders', params);
      const orders = response as BinanceOrderResponse[];
      return orders.map((o) => this.mapOrderToTrade(o, { type: 'MARKET' } as any));
    } catch (error) {
      throw this.handleBinanceError(error, 'getOpenOrders');
    }
  }

  async getBalances(): Promise<Balance[]> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      timestamp: Date.now().toString(),
      recvWindow: this.recvWindow.toString(),
    };
    params.signature = this.sign(params);

    try {
      const response = await this.privateGet('/api/v3/account', params);
      const balances = (response as { balances: BinanceBalance[] }).balances;

      return balances
        .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map((b) => ({
          asset: b.asset,
          free: b.free,
          locked: b.locked,
        }));
    } catch (error) {
      this.recordFailure();
      throw this.handleBinanceError(error, 'getBalances');
    }
  }

  async getPositions(): Promise<Position[]> {
    return [];
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v3/ping`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async getExchangeInfo(): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/api/v3/exchangeInfo`);
    const data = await res.json();
    return data as Record<string, unknown>;
  }

  // ── Asset Info (from BaseTradingAdapter) ──
  getAssetType(): 'crypto' {
    return 'crypto';
  }

  supportsLeverage(): boolean {
    return false;
  }

  getSupportedOrderTypes(): Array<'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT'> {
    return ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'];
  }

  // ── Signing ──
  private sign(params: Record<string, string>): string {
    const queryString = new URLSearchParams(params).toString();
    return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
  }

  // ── HTTP Helpers ──

  private async privatePost(path: string, params: Record<string, string>): Promise<unknown> {
    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: queryString,
    });

    return this.handleResponse(res);
  }

  private async privateGet(path: string, params: Record<string, string>): Promise<unknown> {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}${path}?${queryString}`, {
      headers: { 'X-MBX-APIKEY': this.apiKey },
    });

    return this.handleResponse(res);
  }

  private async privateDelete(path: string, params: Record<string, string>): Promise<unknown> {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}${path}?${queryString}`, {
      method: 'DELETE',
      headers: { 'X-MBX-APIKEY': this.apiKey },
    });

    return this.handleResponse(res);
  }

  private async handleResponse(res: Response): Promise<unknown> {
    if (!res.ok) {
      const text = await res.text();
      let message = text;

      try {
        const err = JSON.parse(text) as BinanceError;
        message = `[Code ${err.code}] ${err.msg}`;
      } catch {}

      throw new Error(`Binance API Error: ${message}`);
    }

    return res.json();
  }

  private handleBinanceError(error: unknown, operation: string): InfraError {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new InfraError(`Binance ${operation} failed: ${message}`, `BINANCE_${operation.toUpperCase()}_FAILED`);
  }

  private mapOrderToTrade(order: BinanceOrderResponse, request: Partial<OrderRequest>): Trade {
    return {
      id: order.clientOrderId || crypto.randomUUID(),
      exchangeOrderId: order.orderId.toString(),
      exchangeAccountId: '',
      symbol: order.symbol,
      side: order.side as Trade['side'],
      type: order.type as Trade['type'],
      quantity: parseFloat(order.origQty),
      price: order.price ? parseFloat(order.price) : null,
      stopPrice: null,
      timeInForce: (request.timeInForce as Trade['timeInForce']) ?? 'GTC',
      status: this.mapStatus(order.status),
      filledQuantity: parseFloat(order.executedQty),
      idempotencyKey: order.clientOrderId || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private mapStatus(status: string): Trade['status'] {
    const map: Record<string, Trade['status']> = {
      NEW: 'PENDING',
      PARTIALLY_FILLED: 'PARTIALLY_FILLED',
      FILLED: 'FILLED',
      CANCELED: 'CANCELLED',
      REJECTED: 'REJECTED',
      EXPIRED: 'EXPIRED',
    };
    return map[status] ?? 'PENDING';
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
    }
  }

  private recordSuccess(): void {
    this._failureCount = 0;
  }
}
