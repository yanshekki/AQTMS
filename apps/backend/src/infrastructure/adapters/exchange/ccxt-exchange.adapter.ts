import { Injectable, Logger } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { IExchangeAdapter, PlaceOrderParams, PlaceOrderResult, OrderStatusResult } from './exchange.adapter.interface';

interface ExchangeConfig {
  exchange: string;
  apiKey: string;
  apiSecret?: string;
  testnet?: boolean;
}

@Injectable()
export class CcxtExchangeAdapter implements IExchangeAdapter {
  private readonly logger = new Logger(CcxtExchangeAdapter.name);
  private exchangeInstances: Map<string, any> = new Map();

  /**
   * Initialize or get exchange instance with dynamic credentials (recommended for per-user accounts)
   */
  async initialize(config: ExchangeConfig): Promise<void> {
    const cacheKey = `${config.exchange}-${config.testnet ? 'testnet' : 'mainnet'}`;

    if (this.exchangeInstances.has(cacheKey)) {
      return;
    }

    let exchange: any;

    const commonOptions = {
      apiKey: config.apiKey,
      secret: config.apiSecret,
      enableRateLimit: true,
      sandbox: config.testnet ?? false,
    };

    if (config.exchange.toLowerCase() === 'binance') {
      exchange = new ccxt.binance({
        ...commonOptions,
        options: { defaultType: 'spot' },
      });
    } else if (config.exchange.toLowerCase() === 'bybit') {
      exchange = new ccxt.bybit({
        ...commonOptions,
        options: { defaultType: 'spot' },
      });
    } else {
      throw new Error(`Unsupported exchange: ${config.exchange}`);
    }

    this.exchangeInstances.set(cacheKey, exchange);
    this.logger.log(`Initialized ${config.exchange} adapter (testnet=${config.testnet})`);
  }

  async placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    try {
      const exchange = await this.getExchangeInstance(params.exchange);

      const orderType = params.type === 'MARKET' ? 'market' : 'limit';
      const side = params.side.toLowerCase();

      const orderParams: any = {
        symbol: params.symbol,
        type: orderType,
        side,
        amount: params.quantity,
      };

      if (params.price && orderType === 'limit') {
        orderParams.price = params.price;
      }

      const result = await exchange.createOrder(
        orderParams.symbol,
        orderParams.type,
        orderParams.side,
        orderParams.amount,
        orderParams.price,
      );

      return {
        success: true,
        exchangeOrderId: result.id,
        status: result.status,
        filledQuantity: result.filled || 0,
        remainingQuantity: result.remaining || params.quantity,
        filledPrice: result.average || result.price,
      };
    } catch (error: any) {
      this.logger.error(`placeOrder failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  private async getExchangeInstance(exchangeName: string) {
    // For simplicity, return the last initialized instance or throw if none
    const instances = Array.from(this.exchangeInstances.values());
    if (instances.length === 0) {
      throw new Error('No exchange initialized. Call initialize() first with API keys.');
    }
    return instances[instances.length - 1]; // Return most recent
  }

  async cancelOrder(exchangeAccountId: string, exchangeOrderId: string): Promise<boolean> {
    try {
      const exchange = await this.getExchangeInstance('');
      await exchange.cancelOrder(exchangeOrderId);
      return true;
    } catch (error: any) {
      this.logger.error(`cancelOrder failed: ${error.message}`);
      return false;
    }
  }

  async getBalance(): Promise<any> {
    try {
      const exchange = await this.getExchangeInstance('');
      return await exchange.fetchBalance();
    } catch (error: any) {
      this.logger.error(`getBalance failed: ${error.message}`);
      return {};
    }
  }

  async getPositions(): Promise<any[]> {
    try {
      const exchange = await this.getExchangeInstance('');
      return await exchange.fetchPositions().catch(() => []);
    } catch (error: any) {
      return [];
    }
  }

  async getOrderStatus(exchangeOrderId: string): Promise<OrderStatusResult | null> {
    try {
      const exchange = await this.getExchangeInstance('');
      const order = await exchange.fetchOrder(exchangeOrderId);
      return {
        exchangeOrderId: order.id,
        status: order.status,
        filledQuantity: order.filled || 0,
        remainingQuantity: order.remaining || 0,
        averagePrice: order.average || order.price,
        lastUpdate: new Date(),
      };
    } catch (error: any) {
      return null;
    }
  }
}
