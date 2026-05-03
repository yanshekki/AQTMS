// ── Binance Trading Adapter (Real Implementation) ──
// Implements Binance Spot REST API v3 with HMAC SHA256 signing.

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

export class BinanceAdapter extends BaseTradingAdapter {
  public readonly exchangeName = 'BINANCE';
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  // Circuit breaker state
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
    };

    if (request.price && request.type !== 'MARKET') {
      params.price = request.price.toString();
    }
    if (request.stopPrice && (request.type === 'STOP_LOSS' || request.type === 'STOP_LOSS_LIMIT' || request.type === 'TAKE_PROFIT' || request.type === 'TAKE_PROFIT_LIMIT')) {
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
        idempotencyKey: request.idempotencyKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.recordFailure();
      throw new InfraError(
        `Binance order failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BINANCE_ORDER_FAILED',
      );
    }
  }

  async cancelOrder(request: CancelOrderRequest): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      symbol: request.symbol,
      orderId: request.exchangeOrderId,
      timestamp: Date.now().toString(),
    };
    params.signature = this.sign(params);

    try {
      const response = await this.privateDelete('/api/v3/order', params);
      const order = response as BinanceOrderResponse;

      this.recordSuccess();
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
        timeInForce: 'GTC',
        status: 'CANCELLED',
        filledQuantity: parseFloat(order.executedQty),
        idempotencyKey: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.recordFailure();
      throw new InfraError(
        `Binance cancel failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BINANCE_CANCEL_FAILED',
      );
    }
  }

  async getOrder(exchangeOrderId: string, symbol: string): Promise<Trade> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = {
      symbol,
      orderId: exchangeOrderId,
      timestamp: Date.now().toString(),
    };
    params.signature = this.sign(params);

    try {
      const response = await this.privateGet('/api/v3/order', params);
      const order = response as BinanceOrderResponse;

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
        timeInForce: 'GTC',
        status: this.mapStatus(order.status),
        filledQuantity: parseFloat(order.executedQty),
        idempotencyKey: order.clientOrderId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new InfraError(
        `Binance getOrder failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BINANCE_GET_ORDER_FAILED',
      );
    }
  }

  // ── Balance & Position ──

  async getBalances(): Promise<Balance[]> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = { timestamp: Date.now().toString() };
    params.signature = this.sign(params);

    try {
      const response = await this.privateGet('/api/v3/account', params);
      const balances = (response as { balances: BinanceBalance[] }).balances;
      return balances
        .filter((b: BinanceBalance) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map((b: BinanceBalance) => ({
          asset: b.asset,
          free: b.free,
          locked: b.locked,
        }));
    } catch (error) {
      this.recordFailure();
      throw new InfraError(
        `Binance getBalances failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BINANCE_BALANCE_FAILED',
      );
    }
  }

  async getPositions(): Promise<Position[]> {
    return []; // Spot exchange — positions are non-zero balances
  }

  // ── Connectivity ──

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v3/ping`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getExchangeInfo(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/api/v3/exchangeInfo`);
    return response.json() as Promise<Record<string, unknown>>;
  }

  // ── Asset Info ──
  getAssetType(): 'crypto' { return 'crypto'; }
  supportsLeverage(): boolean { return false; } // Spot only
  getSupportedOrderTypes(): Array<'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT'> {
    return ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'];
  }

  async getOpenOrders(symbol?: string): Promise<Trade[]> {
    this.checkCircuitBreaker();

    const params: Record<string, string> = { timestamp: Date.now().toString() };
    if (symbol) params.symbol = symbol;
    params.signature = this.sign(params);

    try {
      const response = await this.privateGet('/api/v3/openOrders', params);
      const orders = response as BinanceOrderResponse[];
      return orders.map((o) => ({
        id: o.clientOrderId || crypto.randomUUID(),
        exchangeOrderId: o.orderId.toString(),
        exchangeAccountId: '',
        symbol: o.symbol,
        side: o.side as Trade['side'],
        type: o.type as Trade['type'],
        quantity: parseFloat(o.origQty),
        price: o.price ? parseFloat(o.price) : null,
        stopPrice: null,
        timeInForce: 'GTC' as Trade['timeInForce'],
        status: this.mapStatus(o.status),
        filledQuantity: parseFloat(o.executedQty),
        idempotencyKey: o.clientOrderId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    } catch (error) {
      throw new InfraError(
        `Binance getOpenOrders failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BINANCE_OPEN_ORDERS_FAILED',
      );
    }
  }

  // ── HMAC SHA256 Signing ──

  private sign(params: Record<string, string>): string {
    const queryString = new URLSearchParams(params).toString();
    return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
  }

  // ── HTTP Helpers ──

  private async privatePost(path: string, params: Record<string, string>): Promise<unknown> {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: queryString,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Binance HTTP ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  private async privateGet(path: string, params: Record<string, string>): Promise<unknown> {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseUrl}${path}?${queryString}`, {
      headers: { 'X-MBX-APIKEY': this.apiKey },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Binance HTTP ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  private async privateDelete(path: string, params: Record<string, string>): Promise<unknown> {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseUrl}${path}?${queryString}`, {
      method: 'DELETE',
      headers: { 'X-MBX-APIKEY': this.apiKey },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Binance HTTP ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  // ── Status Mapping ──

  private mapStatus(binanceStatus: string): Trade['status'] {
    const mapping: Record<string, Trade['status']> = {
      NEW: 'PENDING',
      PARTIALLY_FILLED: 'PARTIALLY_FILLED',
      FILLED: 'FILLED',
      CANCELED: 'CANCELLED',
      REJECTED: 'REJECTED',
      EXPIRED: 'EXPIRED',
    };
    return mapping[binanceStatus] ?? 'PENDING';
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
