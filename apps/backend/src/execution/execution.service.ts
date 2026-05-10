import { Injectable, Logger, Inject } from '@nestjs/common';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { RiskService } from '../risk/risk.service';
import { MarketDataService } from '../market-data/market-data.service';
import { IExchangeAdapter } from '../infrastructure/adapters/exchange/exchange.adapter.interface';
import { Order } from '../domain/entities/order.entity';
import { OrderSide, OrderType, OrderStatus } from '../domain/value-objects/order-types';
import { PrismaService } from '../prisma/prisma.service';

export interface ExecutionResult {
  success: boolean;
  order?: Order;
  message: string;
  isPaper: boolean;
}

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly paperTradingService: PaperTradingService,
    private readonly riskService: RiskService,
    private readonly marketDataService: MarketDataService,
    @Inject('IExchangeAdapter') private readonly exchangeAdapter: IExchangeAdapter,
    private readonly prisma: PrismaService,
  ) {
    this.logger.log('ExecutionService initialized');
  }

  async executeOrder(params: {
    userId: string;
    exchangeAccountId: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    isPaper?: boolean;
  }): Promise<ExecutionResult> {
    const isPaper = params.isPaper ?? true;

    // Pre-execution risk check
    const currentPrice = params.price || (await this.marketDataService.getPrice(params.symbol))?.price || 0;
    if (currentPrice === 0) {
      return { success: false, message: 'Unable to determine market price', isPaper };
    }

    const riskCheck = this.riskService.evaluateTradeRisk({
      symbol: params.symbol,
      quantity: params.quantity,
      price: currentPrice,
      accountBalance: isPaper ? await this.paperTradingService.getBalance(params.userId) : 100000, // mock real balance
      currentPositions: isPaper ? await this.paperTradingService.getPositions(params.userId) : [],
    });

    if (!riskCheck.allowed) {
      await this.logExecution(params.userId, undefined, 'EXECUTION_RISK_BLOCKED', {
        symbol: params.symbol,
        quantity: params.quantity,
        price: currentPrice,
        violations: riskCheck.violations,
      });
      return {
        success: false,
        message: `Execution blocked by risk rules: ${riskCheck.violations.join(', ')}`,
        isPaper,
      };
    }

    const order = Order.create({
      userId: params.userId,
      exchangeAccountId: params.exchangeAccountId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
      price: params.price,
      stopLoss: params.stopLoss,
      takeProfit: params.takeProfit,
      isPaper,
    });

    if (isPaper) {
      const paperResult = await this.paperTradingService.placePaperOrder({
        userId: params.userId,
        symbol: params.symbol,
        side: params.side === OrderSide.BUY ? 'BUY' : 'SELL',
        type: params.type === OrderType.MARKET ? 'MARKET' : 'LIMIT',
        quantity: params.quantity,
        price: params.price,
        stopLoss: params.stopLoss,
        takeProfit: params.takeProfit,
      });

      if (paperResult.success && paperResult.filled) {
        order.markAsFilled(params.quantity, currentPrice);
        this.logger.log(`Paper execution successful for order ${order.id}`);
        await this.logExecution(params.userId, order.id, 'PLACE_ORDER_PAPER_SUCCESS', {
          symbol: params.symbol,
          quantity: params.quantity,
          price: currentPrice,
          result: paperResult,
        });
        return { success: true, order, message: paperResult.message, isPaper: true };
      } else {
        order.status = OrderStatus.REJECTED;
        await this.logExecution(params.userId, order.id, 'PLACE_ORDER_PAPER_REJECTED', {
          symbol: params.symbol,
          quantity: params.quantity,
          price: currentPrice,
          result: paperResult,
        });
        return { success: false, order, message: paperResult.message, isPaper: true };
      }
    } else {
      // Real execution via adapter
      try {
        const adapterResult = await this.exchangeAdapter.placeOrder({
          exchangeAccountId: params.exchangeAccountId,
          symbol: params.symbol,
          side: params.side,
          type: params.type,
          quantity: params.quantity,
          price: params.price,
          stopLoss: params.stopLoss,
          takeProfit: params.takeProfit,
        });

        if (adapterResult.success) {
          order.markAsFilled(params.quantity, currentPrice); // assume immediate fill for market
          this.logger.log(`Real execution successful via adapter for order ${order.id}`);
          await this.logExecution(params.userId, order.id, 'PLACE_ORDER_REAL_SUCCESS', {
            symbol: params.symbol,
            quantity: params.quantity,
            price: currentPrice,
            result: adapterResult,
          });
          return { success: true, order, message: 'Order placed on exchange', isPaper: false };
        } else {
          order.status = OrderStatus.REJECTED;
          await this.logExecution(params.userId, order.id, 'PLACE_ORDER_REAL_REJECTED', {
            symbol: params.symbol,
            quantity: params.quantity,
            price: currentPrice,
            result: adapterResult,
          });
          return { success: false, order, message: adapterResult.message || 'Exchange order failed', isPaper: false };
        }
      } catch (error) {
        this.logger.error(`Real execution error: ${error.message}`);
        order.status = OrderStatus.REJECTED;
        return { success: false, order, message: error.message, isPaper: false };
      }
    }
  }

  private async logExecution(
    userId: string,
    orderId: string | undefined,
    action: string,
    details: any,
  ): Promise<void> {
    try {
      await this.prisma.executionLog.create({
        data: {
          userId,
          orderId: orderId || null,
          action,
          details: details as any, // Json
          timestamp: new Date(),
        },
      });
      this.logger.debug(`Logged execution action: ${action} for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to log execution: ${error.message}`);
    }
  }
}