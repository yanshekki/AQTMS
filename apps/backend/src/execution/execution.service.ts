import { Injectable, OnModuleInit } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { PlaceOrderWithProtectionDto } from './dto/place-order-with-protection.dto';
import { retry } from '../common/utils/retry.util';
import { CircuitBreaker } from '../common/circuit-breaker/circuit-breaker';
import { RiskCheckFailedError } from '../common/errors/risk.error';
import { OrderExecutionError } from '../common/errors/order.error';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { KillSwitchService } from '../safety/kill-switch.service';
import { OrderService } from '../order/order.service';
import { ExecutionLoggerService } from './execution-logger.service';
import { ExecutionMetricsCollector } from './metrics-collector.service';
import { ExchangeService } from '../exchange/exchange.service';
import { PlaceOrderParams } from '../exchange/interfaces/exchange.adapter';

@Injectable()
export class ExecutionService implements OnModuleInit {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
  });

  constructor(
    private readonly riskService: RiskService,
    private readonly paperTradingService: PaperTradingService,
    private readonly killSwitchService: KillSwitchService,
    private readonly orderService: OrderService,
    private readonly logger: ExecutionLoggerService,
    private readonly metricsCollector: ExecutionMetricsCollector,
    private readonly exchangeService: ExchangeService,
  ) {}

  async placeOrderWithProtection(dto: PlaceOrderWithProtectionDto & { isPaperTrading?: boolean }) {
    try {
      if (!dto.isPaperTrading) {
        const tradingStatus = this.killSwitchService.isTradingAllowed();
        if (!tradingStatus.allowed) {
          throw new OrderExecutionError(`交易已停止: ${tradingStatus.reason}`);
        }
      }

      const riskResult = await this.riskService.check({
        userId: dto.userId,
        exchange: dto.exchange,
        symbol: dto.symbol,
        side: dto.side,
        quantity: dto.quantity,
        price: dto.price,
      });

      if (!riskResult.passed) {
        throw new RiskCheckFailedError(riskResult.reason || '風險檢查未通過');
      }

      if (dto.isPaperTrading) {
        return this.paperTradingService.placePaperOrder({
          userId: dto.userId,
          symbol: dto.symbol,
          side: dto.side,
          quantity: dto.quantity,
          price: dto.price || 0,
        });
      }

      // === Live Trading via unified ExchangeService ===
      const mainOrderRecord = this.orderService.createOrder({
        userId: dto.userId,
        exchange: dto.exchange,
        symbol: dto.symbol,
        side: dto.side,
        type: 'MARKET',
        quantity: dto.quantity,
        price: dto.price,
      });

      const adapterParams: PlaceOrderParams = {
        symbol: dto.symbol,
        side: dto.side,
        type: 'MARKET',
        quantity: dto.quantity,
        price: dto.price,
      };

      const mainOrderResult = await this.circuitBreaker.execute(() =>
        retry(
          () => this.exchangeService.placeOrder(adapterParams),
          {
            retries: 3,
            delay: 1000,
            shouldRetry: (error) => this.isTransientError(error),
            onRetry: () => this.metricsCollector.recordRetry(),
          },
        ),
      );

      this.orderService.updateOrderStatus(
        mainOrderRecord.id,
        'FILLED' as any,
        mainOrderResult.filledQuantity || dto.quantity,
        mainOrderResult.averagePrice || dto.price,
      );

      this.metricsCollector.recordOrder(true);

      return {
        success: true,
        mode: 'LIVE',
        mainOrder: mainOrderResult,
        mainOrderRecord,
      };
    } catch (error) {
      this.metricsCollector.recordOrder(false);
      this.logger.logError({
        action: 'ORDER_FAILED',
        userId: dto.userId,
        error: error instanceof Error ? error.message : '',
      });
      if (error instanceof RiskCheckFailedError) throw error;
      throw new OrderExecutionError(error instanceof Error ? error.message : 'Execution failed');
    }
  }

  private isTransientError(error: any): boolean {
    const msg = (error?.message || '').toLowerCase();
    return ['timeout', 'econnreset', 'network', 'rate limit', '503', '429'].some(kw => msg.includes(kw));
  }

  // ... handleOrderFillUpdate and other methods ...
}
