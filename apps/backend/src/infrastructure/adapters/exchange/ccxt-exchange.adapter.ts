import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ccxt from 'ccxt';
import { IExchangeAdapter, PlaceOrderParams, PlaceOrderResult } from './exchange.adapter.interface';
import { OrderSide, OrderType } from '../../../domain/value-objects/order-types';

@Injectable()
export class CcxtExchangeAdapter implements IExchangeAdapter {
  private readonly logger = new Logger(CcxtExchangeAdapter.name);
  private exchangeInstances: Map<string, any> = new Map(); // cache by exchangeAccountId or exchange name

  constructor(private readonly configService: ConfigService) {
    this.logger.log('CcxtExchangeAdapter initialized (ccxt ready for Binance/Bybit)');
  }

  private async getExchangeInstance(exchangeAccountId: string, exchangeName: string = 'binance'): Promise<any> {
    // In production: fetch apiKey/secret from Prisma ExchangeAccount by id, decrypt with ENCRYPTION_KEY
    // For demo: use env vars or mock
    const cacheKey = `${exchangeAccountId}-${exchangeName}`;
    if (this.exchangeInstances.has(cacheKey)) {
      return this.exchangeInstances.get(cacheKey);
    }

    let exchange: any;
    if (exchangeName.toLowerCase() === 'binance') {
      exchange = new ccxt.binance({
        apiKey: this.configService.get('BINANCE_API_KEY') || 'demo-key',
        secret: this.configService.get('BINANCE_API_SECRET') || 'demo-secret',
        sandbox: true, // testnet
        enableRateLimit: true,
      });
    } else if (exchangeName.toLowerCase() === 'bybit') {
      exchange = new ccxt.bybit({
        apiKey: this.configService.get('BYBIT_API_KEY') || 'demo-key',
        secret: this.configService.get('BYBIT_API_SECRET') || 'demo-secret',
        sandbox: true,
        enableRateLimit: true,
      });
    } else {
      throw new Error(`Unsupported exchange: ${exchangeName}`);
    }

    this.exchangeInstances.set(cacheKey, exchange);
    return exchange;
  }

  async placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    try {
      const exchangeName = 'binance'; // TODO: determine from exchangeAccountId via DB
      const exchange = await this.getExchangeInstance(params.exchangeAccountId, exchangeName);

      const orderType = params.type === OrderType.MARKET ? 'market' : 'limit';
      const side = params.side === OrderSide.BUY ? 'buy' : 'sell';

      const orderParams: any = {
        symbol: params.symbol,
        type: orderType,
        side,
        amount: params.quantity,
      };

      if (params.type === OrderType.LIMIT && params.price) {
        orderParams.price = params.price;
      }

      // Note: stopLoss/takeProfit often require separate conditional orders or post-only
      // For simplicity, log and place main order
      if (params.stopLoss || params.takeProfit) {
        this.logger.warn('StopLoss/TakeProfit not fully implemented in basic ccxt adapter yet');
      }

      const result = await exchange.createOrder(
        orderParams.symbol,
        orderParams.type,
        orderParams.side,
        orderParams.amount,
        orderParams.price,
      );

      this.logger.log(`ccxt order placed: ${result.id} on ${exchangeName}`);

      return {
        success: true,
        exchangeOrderId: result.id,
        message: 'Order placed successfully via ccxt',
        filledPrice: result.average || result.price,
      };
    } catch (error) {
      this.logger.error(`ccxt placeOrder error: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async cancelOrder(exchangeAccountId: string, exchangeOrderId: string): Promise<boolean> {
    try {
      const exchange = await this.getExchangeInstance(exchangeAccountId);
      await exchange.cancelOrder(exchangeOrderId);
      return true;
    } catch (error) {
      this.logger.error(`Cancel error: ${error.message}`);
      return false;
    }
  }

  async getBalance(exchangeAccountId: string): Promise<number> {
    try {
      const exchange = await this.getExchangeInstance(exchangeAccountId);
      const balance = await exchange.fetchBalance();
      return balance.total?.USDT || 0;
    } catch {
      return 0;
    }
  }

  async getPositions(exchangeAccountId: string): Promise<any[]> {
    try {
      const exchange = await this.getExchangeInstance(exchangeAccountId);
      const positions = await exchange.fetchPositions();
      return positions || [];
    } catch {
      return [];
    }
  }
}