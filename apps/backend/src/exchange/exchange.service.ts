import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';
import { IExchangeAdapter, PlaceOrderParams, OrderResult } from './interfaces/exchange.adapter';

@Injectable()
export class ExchangeService implements IExchangeAdapter {
  private readonly logger = new Logger(ExchangeService.name);
  private readonly ccxtAdapter: CcxtExchangeAdapter;

  constructor(
    private readonly configService: ConfigService,
    ccxtAdapter: CcxtExchangeAdapter,
  ) {
    this.ccxtAdapter = ccxtAdapter;
    this.logger.log('ExchangeService initialized with CcxtExchangeAdapter');
  }

  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    // Simple mapping - in real usage we would need proper conversion
    return this.ccxtAdapter.placeOrder(params as any) as any;
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    return this.ccxtAdapter.cancelOrder('', orderId);
  }

  async getOrder(orderId: string, symbol: string): Promise<OrderResult | null> {
    return this.ccxtAdapter.getOrderStatus('', orderId) as any;
  }

  async getPositions(): Promise<any[]> {
    return this.ccxtAdapter.getPositions('');
  }

  async getAccountBalance(): Promise<any> {
    return this.ccxtAdapter.getBalance('');
  }
}
