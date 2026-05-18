// ── Base Trading Adapter (Abstract Port for Hexagonal Architecture) ──
// All exchange adapters MUST extend this class. Core domain code only depends on this interface.

import type { Money } from '../../../domain/value-objects/Money';
import { Trade } from '../../../domain/entities/Trade';

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  idempotencyKey: string;
}

export interface Balance {
  asset: string;
  free: string;
  locked: string;
}

export interface Position {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: Money;
}

export interface CancelOrderRequest {
  symbol: string;
  exchangeOrderId: string;
}

export abstract class BaseTradingAdapter {
  public abstract readonly exchangeName: string;

  // ── Order Operations ──
  abstract createOrder(request: OrderRequest): Promise<Trade>;
  abstract cancelOrder(request: CancelOrderRequest): Promise<Trade>;
  abstract getOrder(exchangeOrderId: string, symbol: string): Promise<Trade>;
  abstract getOpenOrders(symbol?: string): Promise<Trade[]>;

  // ── Balance & Position ──
  abstract getBalances(): Promise<Balance[]>;
  abstract getPositions(): Promise<Position[]>;

  // ── Asset Info ──
  abstract getAssetType(): 'crypto' | 'stock' | 'futures' | 'option' | 'dex';
  abstract supportsLeverage(): boolean;
  abstract getSupportedOrderTypes(): Array<'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT'>;

  // ── Connectivity ──
  abstract testConnection(): Promise<boolean>;
  abstract getExchangeInfo(): Promise<Record<string, unknown>>;

  // ── Error handling ──
  protected handleError(error: unknown, operation: string): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`[${this.exchangeName}] ${operation} failed: ${message}`);
  }
}
