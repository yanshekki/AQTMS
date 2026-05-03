// ── Futu Adapter ──
// Connects to Futu OpenD (local gateway on port 11111).

import { BaseTradingAdapter, type OrderRequest, type Balance, type Position, type CancelOrderRequest } from '../exchanges/BaseTradingAdapter';
import type { Trade } from '../../../domain/entities/Trade';
import { InfraError } from '../../../shared/errors';

export interface FutuAdapterConfig {
  openDHost?: string;
  openDPort?: number;
  accountId?: string;
}

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 11111;

export class FutuAdapter extends BaseTradingAdapter {
  public readonly exchangeName = 'FUTU';
  private readonly host: string;
  private readonly port: number;
  private readonly accountId: string;

  constructor(config: FutuAdapterConfig = {}) {
    super();
    this.host = config.openDHost ?? DEFAULT_HOST;
    this.port = config.openDPort ?? DEFAULT_PORT;
    this.accountId = config.accountId ?? '';
  }

  getAssetType(): 'stock' { return 'stock'; }
  supportsLeverage(): boolean { return true; }
  getSupportedOrderTypes(): Array<'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT'> {
    return ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT'];
  }

  private async openDRest<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    const url = `http://${this.host}:${this.port}${path}`;
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`Futu OpenD HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }

  async createOrder(request: OrderRequest): Promise<Trade> {
    try {
      const market = this.inferMarket(request.symbol);
      const result = await this.openDRest<{ retCode: number; retMsg: string; data?: { orderId: string; status: number } }>(
        '/api/trade/place_order',
        { accountId: this.accountId, code: request.symbol, market, trdSide: request.side === 'BUY' ? 1 : 2, orderType: this.mapFutuOrderType(request.type), qty: request.quantity, ...(request.price ? { price: request.price } : {}) },
      );
      if (result.retCode !== 0) throw new Error(result.retMsg);
      return {
        id: request.idempotencyKey || (crypto.randomUUID ? crypto.randomUUID() : `futu-${Date.now()}`),
        exchangeOrderId: result.data?.orderId ?? 'pending',
        exchangeAccountId: this.accountId, symbol: request.symbol, side: request.side, type: request.type,
        quantity: request.quantity, price: request.price ?? null, stopPrice: request.stopPrice ?? null,
        timeInForce: request.timeInForce ?? 'GTC', status: 'PENDING', filledQuantity: 0,
        idempotencyKey: request.idempotencyKey, createdAt: new Date(), updatedAt: new Date(),
      };
    } catch (error) { throw new InfraError(`Futu order failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'FUTU_ORDER_FAILED'); }
  }

  async cancelOrder(request: CancelOrderRequest): Promise<Trade> {
    await this.openDRest('/api/trade/cancel_order', { accountId: this.accountId, orderId: request.exchangeOrderId });
    return { id: `cancel-${request.exchangeOrderId}`, exchangeOrderId: request.exchangeOrderId, exchangeAccountId: this.accountId, symbol: request.symbol, side: 'BUY', type: 'LIMIT', quantity: 0, price: null, stopPrice: null, timeInForce: 'GTC', status: 'CANCELLED', filledQuantity: 0, idempotencyKey: '', createdAt: new Date(), updatedAt: new Date() };
  }

  async getOrder(exchangeOrderId: string, _symbol: string): Promise<Trade> {
    const result = await this.openDRest<{ data?: { orderId: string; code: string; qty: number; price: number; status: number; filledQty: number } }>(`/api/trade/order_detail?orderId=${exchangeOrderId}`);
    const o = result.data!;
    return { id: o.orderId, exchangeOrderId: o.orderId, exchangeAccountId: this.accountId, symbol: o.code, side: 'BUY', type: 'LIMIT', quantity: o.qty, price: o.price, stopPrice: null, timeInForce: 'GTC', status: o.status === 5 ? 'FILLED' : 'PENDING', filledQuantity: o.filledQty, idempotencyKey: o.orderId, createdAt: new Date(), updatedAt: new Date() };
  }

  async getOpenOrders(_symbol?: string): Promise<Trade[]> {
    const result = await this.openDRest<{ data?: Array<{ orderId: string; code: string; qty: number; price: number; status: number; filledQty: number }> }>(`/api/trade/order_list?accountId=${this.accountId}`);
    return (result.data ?? []).map((o) => ({ id: o.orderId, exchangeOrderId: o.orderId, exchangeAccountId: this.accountId, symbol: o.code, side: 'BUY', type: 'LIMIT', quantity: o.qty, price: o.price, stopPrice: null, timeInForce: 'GTC', status: o.status === 5 ? 'FILLED' : 'PENDING', filledQuantity: o.filledQty, idempotencyKey: o.orderId, createdAt: new Date(), updatedAt: new Date() }));
  }

  async getBalances(): Promise<Balance[]> {
    const result = await this.openDRest<{ data?: Array<{ currency: string; cash: number; frozen: number }> }>(`/api/account/funds?accountId=${this.accountId}`);
    return (result.data ?? []).map((f) => ({ asset: f.currency, free: f.cash.toString(), locked: f.frozen.toString() }));
  }

  async getPositions(): Promise<Position[]> {
    const result = await this.openDRest<{ data?: Array<{ code: string; qty: number; costPrice: number; marketVal: number; plVal: number; positionSide: number }> }>(`/api/trade/position_list?accountId=${this.accountId}`);
    return (result.data ?? []).map((p) => ({ symbol: p.code, side: p.positionSide === 1 ? 'BUY' : 'SELL', quantity: Math.abs(p.qty), entryPrice: p.costPrice, markPrice: p.marketVal / Math.abs(p.qty), unrealizedPnl: { amount: p.plVal.toString(), currency: 'HKD', _amount: p.plVal.toString(), _currency: 'HKD', equals: () => false, toJSON: () => ({ amount: p.plVal.toString(), currency: 'HKD' }) } })) as never as Position[];
  }

  async getQuotes(symbols: string[]): Promise<Array<{ symbol: string; bid: number; ask: number; last: number }>> {
    const results: Array<{ symbol: string; bid: number; ask: number; last: number }> = [];
    for (const s of symbols) {
      const r = await this.openDRest<{ data?: { bidPrice: number; askPrice: number; lastPrice: number } }>(`/api/quote?code=${s}`);
      if (r.data) results.push({ symbol: s, bid: r.data.bidPrice, ask: r.data.askPrice, last: r.data.lastPrice });
    }
    return results;
  }

  async testConnection(): Promise<boolean> {
    try { const r = await this.openDRest<{ retCode: number }>('/api/status'); return r.retCode === 0; } catch { return false; }
  }

  async getExchangeInfo(): Promise<Record<string, unknown>> { return this.openDRest('/api/market/info'); }

  private inferMarket(symbol: string): number {
    if (/^\d{5}$/.test(symbol) || symbol.startsWith('HK.')) return 1;
    if (/^[A-Z]{1,5}$/.test(symbol) || symbol.startsWith('US.')) return 11;
    if (/^\d{6}$/.test(symbol) || symbol.startsWith('SH.') || symbol.startsWith('SZ.')) return 3;
    return 1;
  }

  private mapFutuOrderType(type: OrderRequest['type']): number {
    const m: Record<string, number> = { MARKET: 1, LIMIT: 2, STOP_LOSS: 5, STOP_LOSS_LIMIT: 6, TAKE_PROFIT: 7, TAKE_PROFIT_LIMIT: 8 };
    return m[type] ?? 2;
  }
}
