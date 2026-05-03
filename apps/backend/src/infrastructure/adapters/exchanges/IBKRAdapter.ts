// ── IBKR Adapter ──
// Connects to Interactive Brokers via TWS/Gateway REST API (Client Portal).
// Supports stocks, futures, options, forex, bonds worldwide.

import { BaseTradingAdapter, type OrderRequest, type Balance, type Position, type CancelOrderRequest } from '../exchanges/BaseTradingAdapter';
import type { Trade } from '../../../domain/entities/Trade';
import { InfraError } from '../../../shared/errors';

export interface IBKRAdapterConfig {
  gatewayHost?: string;  // Default: localhost
  gatewayPort?: number;  // Default: 5000 (Client Portal) or 4001 (TWS API)
  accountId?: string;
}

const DEFAULT_IBKR_HOST = '127.0.0.1';
const DEFAULT_IBKR_PORT = 5000; // Client Portal Gateway

export class IBKRAdapter extends BaseTradingAdapter {
  public readonly exchangeName = 'IBKR';
  private readonly host: string;
  private readonly port: number;
  private readonly accountId: string;

  constructor(config: IBKRAdapterConfig = {}) {
    super();
    this.host = config.gatewayHost ?? DEFAULT_IBKR_HOST;
    this.port = config.gatewayPort ?? DEFAULT_IBKR_PORT;
    this.accountId = config.accountId ?? '';
  }

  // ── Asset Info ──
  getAssetType(): 'stock' { return 'stock'; }
  supportsLeverage(): boolean { return true; }
  getSupportedOrderTypes(): Array<'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT'> {
    return ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'];
  }

  // ── IBKR REST helper ──
  private async ibkrRest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `https://${this.host}:${this.port}/v1/api${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      // IBKR Gateway uses self-signed certs in dev
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`IBKR HTTP ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  // ── Contract ID resolution ──
  async getContractDetails(symbol: string): Promise<{
    conid: number;
    symbol: string;
    assetClass: string;
    currency: string;
    exchange: string;
    description: string;
  }> {
    try {
      const result = await this.ibkrRest<{
        data?: Array<{ conid: number; symbol: string; assetClass: string; currency: string; exchange: string; description: string }>;
      }>(`/iserver/secdef/search?symbol=${encodeURIComponent(symbol)}`);

      if (result.data?.[0]) return result.data[0];
      throw new Error(`Contract not found: ${symbol}`);
    } catch (error) {
      throw new InfraError(`IBKR contract lookup failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'IBKR_CONTRACT_FAILED');
    }
  }

  // ── Order Operations ──
  async createOrder(request: OrderRequest): Promise<Trade> {
    try {
      const contract = await this.getContractDetails(request.symbol);

      const orderBody = {
        acctId: this.accountId,
        conid: contract.conid,
        orderType: request.type === 'MARKET' ? 'MKT' : request.type === 'LIMIT' ? 'LMT' : 'STP',
        side: request.side,
        quantity: request.quantity,
        ...(request.price ? { price: request.price } : {}),
        tif: request.timeInForce ?? 'GTC',
      };

      const result = await this.ibkrRest<{
        data?: Array<{ order_id: string; order_status: string }>;
      }>(`/iserver/account/${this.accountId}/orders`, {
        method: 'POST',
        body: JSON.stringify({ orders: [orderBody] }),
      });

      if (!result.data?.[0]) throw new Error('No order ID returned');

      return {
        id: request.idempotencyKey,
        exchangeOrderId: result.data[0].order_id,
        exchangeAccountId: this.accountId,
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        quantity: request.quantity,
        price: request.price ?? null,
        stopPrice: request.stopPrice ?? null,
        timeInForce: request.timeInForce ?? 'GTC',
        status: 'PENDING',
        filledQuantity: 0,
        idempotencyKey: request.idempotencyKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new InfraError(`IBKR order failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'IBKR_ORDER_FAILED');
    }
  }

  async cancelOrder(request: CancelOrderRequest): Promise<Trade> {
    try {
      await this.ibkrRest(
        `/iserver/account/${this.accountId}/order/${request.exchangeOrderId}`,
        { method: 'DELETE' },
      );

      return {
        id: `cancel-${request.exchangeOrderId}`,
        exchangeOrderId: request.exchangeOrderId,
        exchangeAccountId: this.accountId,
        symbol: request.symbol,
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0,
        price: null,
        stopPrice: null,
        timeInForce: 'GTC',
        status: 'CANCELLED',
        filledQuantity: 0,
        idempotencyKey: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new InfraError(`IBKR cancel failed`, 'IBKR_CANCEL_FAILED');
    }
  }

  async getOrder(exchangeOrderId: string, _symbol: string): Promise<Trade> {
    try {
      const result = await this.ibkrRest<{
        data?: { orderId: string; conid: number; side: string; orderType: string; quantity: number; price: number; orderStatus: string; filledQuantity: number; symbol: string };
      }>(`/iserver/account/order/status/${exchangeOrderId}`);

      const o = result.data!;
      return {
        id: o.orderId,
        exchangeOrderId: o.orderId,
        exchangeAccountId: this.accountId,
        symbol: o.symbol,
        side: o.side as Trade['side'],
        type: o.orderType === 'MKT' ? 'MARKET' : 'LIMIT',
        quantity: o.quantity,
        price: o.price,
        stopPrice: null,
        timeInForce: 'GTC',
        status: o.orderStatus === 'Filled' ? 'FILLED' : 'PENDING',
        filledQuantity: o.filledQuantity,
        idempotencyKey: o.orderId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new InfraError(`IBKR getOrder failed`, 'IBKR_GET_ORDER_FAILED');
    }
  }

  async getOpenOrders(_symbol?: string): Promise<Trade[]> {
    try {
      const result = await this.ibkrRest<{
        data?: Array<{ orderId: string; symbol: string; side: string; orderType: string; quantity: number; price: number; orderStatus: string; filledQuantity: number }>;
      }>(`/iserver/account/${this.accountId}/orders`);

      return (result.data ?? []).map((o) => ({
        id: o.orderId,
        exchangeOrderId: o.orderId,
        exchangeAccountId: this.accountId,
        symbol: o.symbol,
        side: o.side as Trade['side'],
        type: o.orderType === 'MKT' ? 'MARKET' : 'LIMIT',
        quantity: o.quantity,
        price: o.price,
        stopPrice: null,
        timeInForce: 'GTC',
        status: o.orderStatus === 'Filled' ? 'FILLED' : 'PENDING',
        filledQuantity: o.filledQuantity,
        idempotencyKey: o.orderId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    } catch {
      return [];
    }
  }

  // ── Balance & Account ──
  async getAccountSummary(): Promise<Record<string, string>> {
    const result = await this.ibkrRest<{
      data?: Record<string, { amount: number; currency: string }>;
    }>(`/portfolio/${this.accountId}/summary`);

    const summary: Record<string, string> = {};
    if (result.data) {
      for (const [key, val] of Object.entries(result.data)) {
        summary[key] = `${val.amount} ${val.currency}`;
      }
    }
    return summary;
  }

  async getBalances(): Promise<Balance[]> {
    try {
      const result = await this.ibkrRest<{
        data?: Array<{ currency: string; cashbalance: number; availablefunds: number; buyingpower: number }>;
      }>(`/portfolio/${this.accountId}/ledger`);

      return (result.data ?? []).map((b) => ({
        asset: b.currency,
        free: b.availablefunds.toString(),
        locked: (b.cashbalance - b.availablefunds).toString(),
      }));
    } catch {
      return [];
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const result = await this.ibkrRest<{
        data?: Array<{
          contractDesc: string; symbol: string; position: number;
          mktPrice: number; mktValue: number; avgCost: number; unrealizedPnl: number;
        }>;
      }>(`/portfolio/${this.accountId}/positions/0`);

      return (result.data ?? []).map((p) => ({
        symbol: p.symbol,
        side: p.position > 0 ? 'BUY' : 'SELL',
        quantity: Math.abs(p.position),
        entryPrice: p.avgCost,
        markPrice: p.mktPrice,
        unrealizedPnl: { amount: p.unrealizedPnl.toString(), currency: 'USD' } as unknown as never,
      })) as unknown as Position[];
    } catch {
      return [];
    }
  }

  // ── Connectivity ──
  async testConnection(): Promise<boolean> {
    try {
      await this.ibkrRest('/iserver/auth/status');
      return true;
    } catch {
      return false;
    }
  }

  async getExchangeInfo(): Promise<Record<string, unknown>> {
    return this.ibkrRest('/iserver/accounts');
  }
}
