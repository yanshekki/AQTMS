import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BinanceAdapter } from './adapters/binance.adapter';
import { BybitAdapter } from './adapters/bybit.adapter';
import { IExchangeAdapter, PlaceOrderParams, OrderResult } from './interfaces/exchange.adapter';

@Injectable()
export class ExchangeService implements IExchangeAdapter {
  private readonly activeAdapter: IExchangeAdapter;

  constructor(
    private readonly configService: ConfigService,
    private readonly binanceAdapter: BinanceAdapter,
    private readonly bybitAdapter: BybitAdapter,
  ) {
    const provider = this.configService.get<string>('EXCHANGE_PROVIDER', 'BINANCE').toUpperCase();

    if (provider === 'BYBIT') {
      this.activeAdapter = this.bybitAdapter;
      console.log('[ExchangeService] Using BybitAdapter');
    } else {
      this.activeAdapter = this.binanceAdapter;
      console.log('[ExchangeService] Using BinanceAdapter');
    }
  }

  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    return this.activeAdapter.placeOrder(params);
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    return this.activeAdapter.cancelOrder(orderId, symbol);
  }

  async getOrder(orderId: string, symbol: string): Promise<OrderResult | null> {
    return this.activeAdapter.getOrder(orderId, symbol);
  }

  async getPositions(): Promise<any[]> {
    return this.activeAdapter.getPositions();
  }

  async getAccountBalance(): Promise<any> {
    return this.activeAdapter.getAccountBalance();
  }
}
