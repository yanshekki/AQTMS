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

  onModuleInit() {
    console.log('[ExecutionService] ExecutionLogger integration enabled');
  }

  async placeOrderWithProtection(dto: PlaceOrderWithProtectionDto & { isPaperTrading?: boolean }) {
    const startTime = Date.now();

    try {
      // Kill Switch 檢查
      if (!dto.isPaperTrading) {
        const tradingStatus = this.killSwitchService.isTradingAllowed();
        if (!tradingStatus.allowed) {
          this.logger.logError({
            action: 'ORDER_BLOCKED_BY_KILL_SWITCH',
            userId: dto.userId,
            error: tradingStatus.reason || 'Kill switch active',
          });
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

      // Live Trading
      const mainOrderRecord = this.orderService.createOrder({
        userId: dto.userId,
        exchange: dto.exchange,
        symbol: dto.symbol,
        side: dto.side,
        type: 'MARKET',
        quantity: dto.quantity,
        price: dto.price,
      });

      this.logger.logPlacement({
        userId: dto.userId,
        orderId: mainOrderRecord.id,
        symbol: dto.symbol,
        side: dto.side,
        quantity: dto.quantity,
        price: dto.price,
      });

      const mainOrderResult = await this.circuitBreaker.execute(() =>
        retry(
          () => this.placeMainOrder(dto),
          {
            retries: 3,
            delay: 1000,
            shouldRetry: (error) => this.isTransientError(error),
            onRetry: (error, attempt) => {
              this.logger.logRetry({
                orderId: mainOrderRecord.id,
                attempt,
                error: error?.message || 'Unknown error',
              });
            },
          },
        ),
      );

      const latency = Date.now() - startTime;

      this.logger.logPlacement({
        userId: dto.userId,
        orderId: mainOrderRecord.id,
        symbol: dto.symbol,
        side: dto.side,
        quantity: dto.quantity,
        latencyMs: latency,
      });

      this.orderService.updateOrderStatus(mainOrderRecord.id, 'FILLED' as any, dto.quantity, dto.price);

      return {
        success: true,
        mode: 'LIVE',
        mainOrder: mainOrderResult,
        mainOrderRecord,
      };
    } catch (error) {
      this.logger.logError({
        action: 'ORDER_EXECUTION_FAILED',
        userId: dto.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof RiskCheckFailedError) throw error;
      throw new OrderExecutionError(error instanceof Error ? error.message : 'Live order execution failed');
    }
  }

  private isTransientError(error: any): boolean {
    const msg = (error?.message || '').toLowerCase();
    return ['timeout', 'econnreset', 'network', 'rate limit', '503', '429'].some(kw => msg.includes(kw));
  }

  private async placeMainOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution][LIVE] Placing MAIN order: ${dto.side} ${dto.quantity} ${dto.symbol}`);
    return { orderId: 'live-main-' + Date.now(), status: 'FILLED' };
  }

  private async placeStopLossOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution][LIVE] Placing STOP LOSS`);
    return { orderId: 'live-sl-' + Date.now(), status: 'NEW' };
  }

  private async placeTakeProfitOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution][LIVE] Placing TAKE PROFIT`);
    return { orderId: 'live-tp-' + Date.now(), status: 'NEW' };
  }
}
