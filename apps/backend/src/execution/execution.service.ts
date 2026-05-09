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
  ) {}

  async placeOrderWithProtection(dto: PlaceOrderWithProtectionDto & { isPaperTrading?: boolean }) {
    const overallStart = Date.now();
    let riskCheckLatency = 0;
    let orderCreationLatency = 0;
    let resilienceLatency = 0;

    try {
      // Kill Switch 檢查
      if (!dto.isPaperTrading) {
        const tradingStatus = this.killSwitchService.isTradingAllowed();
        if (!tradingStatus.allowed) {
          this.logger.logError({ action: 'ORDER_BLOCKED', userId: dto.userId, error: tradingStatus.reason || '' });
          throw new OrderExecutionError(`交易已停止: ${tradingStatus.reason}`);
        }
      }

      // 風險檢查 + 計時
      const riskStart = Date.now();
      const riskResult = await this.riskService.check({
        userId: dto.userId,
        exchange: dto.exchange,
        symbol: dto.symbol,
        side: dto.side,
        quantity: dto.quantity,
        price: dto.price,
      });
      riskCheckLatency = Date.now() - riskStart;

      if (!riskResult.passed) {
        throw new RiskCheckFailedError(riskResult.reason || '風險檢查未通過');
      }

      if (dto.isPaperTrading) {
        return this.paperTradingService.placePaperOrder({ /* ... */ });
      }

      // 建立訂單記錄 + 計時
      const creationStart = Date.now();
      const mainOrderRecord = this.orderService.createOrder({
        userId: dto.userId,
        exchange: dto.exchange,
        symbol: dto.symbol,
        side: dto.side,
        type: 'MARKET',
        quantity: dto.quantity,
        price: dto.price,
      });
      orderCreationLatency = Date.now() - creationStart;

      this.logger.logPlacement({
        userId: dto.userId,
        orderId: mainOrderRecord.id,
        symbol: dto.symbol,
        side: dto.side,
        quantity: dto.quantity,
      });

      // Resilience 執行 + 計時
      const resilienceStart = Date.now();
      const mainOrderResult = await this.circuitBreaker.execute(() =>
        retry(() => this.placeMainOrder(dto), {
          retries: 3,
          delay: 1000,
          shouldRetry: (error) => this.isTransientError(error),
        }),
      );
      resilienceLatency = Date.now() - resilienceStart;

      const totalLatency = Date.now() - overallStart;

      // 記錄細粒度延遲
      this.logger.logPlacement({
        userId: dto.userId,
        orderId: mainOrderRecord.id,
        symbol: dto.symbol,
        side: dto.side,
        quantity: dto.quantity,
        latencyMs: totalLatency,
        metadata: {
          breakdown: {
            riskCheck: riskCheckLatency,
            orderCreation: orderCreationLatency,
            resilience: resilienceLatency,
            total: totalLatency,
          },
        },
      });

      this.orderService.updateOrderStatus(mainOrderRecord.id, 'FILLED' as any, dto.quantity, dto.price);

      return {
        success: true,
        mode: 'LIVE',
        mainOrder: mainOrderResult,
        mainOrderRecord,
        latencyBreakdown: {
          riskCheck: riskCheckLatency,
          orderCreation: orderCreationLatency,
          resilience: resilienceLatency,
          total: totalLatency,
        },
      };
    } catch (error) {
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

  // ... existing private methods (placeMainOrder, etc.) ...
}
