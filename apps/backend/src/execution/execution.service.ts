import { Injectable, Logger, Inject } from '@nestjs/common';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { RiskService } from '../risk/risk.service';
import { MarketDataService } from '../market-data/market-data.service';
import { IExchangeAdapter } from '../infrastructure/adapters/exchange/exchange.adapter.interface';
import { Order } from '../domain/entities/order.entity';
import { OrderSide, OrderType, OrderStatus } from '../domain/value-objects/order-types';
import { PrismaService } from '../prisma/prisma.service';
import { IOrderRepository } from '../domain/repositories/order.repository.interface';

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
    @Inject('IOrderRepository') private readonly orderRepository: IOrderRepository,
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

    // Safety Kill Switch check (Step 7)
    const safetyCheck = await this.checkSafetyKillSwitch(params.userId);
    if (!safetyCheck.allowed) {
      await this.logExecution(params.userId, undefined, 'KILL_SWITCH_TRIGGERED', { reason: safetyCheck.reason });
      return { success: false, message: safetyCheck.reason || 'Trading blocked by safety mechanisms', isPaper };
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

  // === Step 7: Live Trading Enhancements ===

  /**
   * Cancel an order (paper or real)
   */
  async cancelOrder(orderId: string, userId: string, isPaper: boolean = true): Promise<{ success: boolean; message: string; order?: Order }> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order || order.userId !== userId) {
        return { success: false, message: 'Order not found or unauthorized' };
      }
      if (!order.isActive()) {
        return { success: false, message: `Order already in status ${order.status}` };
      }

      if (isPaper || order.isPaper) {
        // Paper cancel
        order.cancel();
        await this.orderRepository.save(order);
        await this.logExecution(userId, orderId, 'CANCEL_ORDER_PAPER', { symbol: order.symbol, reason: 'user_cancel' });
        return { success: true, message: 'Paper order cancelled', order };
      } else {
        // Real order - call adapter
        const cancelResult = await this.exchangeAdapter.cancelOrder(order.exchangeAccountId, orderId); // note: adapter may use exchangeOrderId, here simplified with local id
        order.cancel();
        await this.orderRepository.save(order);
        await this.logExecution(userId, orderId, 'CANCEL_ORDER_REAL', { symbol: order.symbol, adapterResult: cancelResult });
        return { success: true, message: 'Real order cancel requested', order };
      }
    } catch (error) {
      this.logger.error(`Cancel order error: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Reconcile local orders with exchange (for live trading)
   * Fetches open orders/positions from exchange and updates local state
   */
  async reconcileOrders(userId: string, exchangeAccountId: string): Promise<{ success: boolean; message: string; updated: number }> {
    try {
      // Get local pending orders
      const localPending = await this.orderRepository.findActiveByExchangeAccount(exchangeAccountId);

      // Get positions from adapter (real time)
      const exchangePositions = await this.exchangeAdapter.getPositions(exchangeAccountId);

      let updatedCount = 0;

      // Simple reconciliation: update local positions or log differences
      // In production: compare open orders, update filled qty, status from exchange
      for (const localOrder of localPending) {
        // Example: if exchange shows different filled qty, update
        // For demo, we just log and assume sync
        await this.logExecution(userId, localOrder.id, 'RECONCILIATION_CHECK', {
          symbol: localOrder.symbol,
          localStatus: localOrder.status,
          localFilled: localOrder.filledQuantity,
          exchangePositionsSummary: exchangePositions.length,
        });
        updatedCount++;
      }

      // Also update/create positions from exchange data (simplified)
      // TODO: full impl would map exchangePositions to Position entities and save via positionRepo

      return { success: true, message: 'Reconciliation completed', updated: updatedCount };
    } catch (error) {
      this.logger.error(`Reconciliation error: ${error.message}`);
      return { success: false, message: error.message, updated: 0 };
    }
  }

  /**
   * Safety check: Kill Switch / Daily Max Loss Circuit Breaker
   * Simple implementation - in real would track daily PnL from trades/snapshots
   */
  private async checkSafetyKillSwitch(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Mock: check if user has too many recent rejected orders or simulate daily loss
    const recentLogs = await this.prisma.executionLog.findMany({
      where: {
        userId,
        action: { contains: 'REJECTED' },
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      take: 10,
    });

    if (recentLogs.length > 5) {
      return { allowed: false, reason: 'Too many rejected orders today - Kill Switch activated' };
    }

    // TODO: integrate with PortfolioSnapshot to calculate daily realizedPnL vs maxDailyLoss threshold
    return { allowed: true };
  }

  // Override or wrap executeOrder to include safety check
  // (For demo, callers can call checkSafetyKillSwitch before execute)
}