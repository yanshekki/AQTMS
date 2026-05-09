import { Injectable, OnModuleInit } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { PlaceOrderWithProtectionDto } from './dto/place-order-with-protection.dto';
import { retry } from '../common/utils/retry.util';
import { CircuitBreaker } from '../common/circuit-breaker/circuit-breaker';
import { RiskCheckFailedError } from '../common/errors/risk.error';
import { OrderExecutionError } from '../common/errors/order.error';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { KillSwitchService } from '../safety/kill-switch.service';

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
  ) {}

  onModuleInit() {
    console.log('[ExecutionService] Kill Switch integration enabled');
  }

  async placeOrderWithProtection(dto: PlaceOrderWithProtectionDto & { isPaperTrading?: boolean }) {
    // 先檢查 Kill Switch
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

    // Live Trading
    try {
      const mainOrder = await this.circuitBreaker.execute(() =>
        retry(() => this.placeMainOrder(dto), {
          retries: 3,
          delay: 1000,
          factor: 2,
          shouldRetry: (error) => this.isTransientError(error),
        }),
      );

      // ... Stop Loss / Take Profit with resilience ...

      return {
        success: true,
        mode: 'LIVE',
        mainOrder,
        // ...
      };
    } catch (error) {
      if (error instanceof RiskCheckFailedError) throw error;
      throw new OrderExecutionError(error instanceof Error ? error.message : 'Live order execution failed');
    }
  }

  private isTransientError(error: any): boolean {
    const msg = (error?.message || '').toLowerCase();
    return ['timeout', 'econnreset', 'network', 'rate limit', '503', '429'].some(kw => msg.includes(kw));
  }

  // ... existing placeMainOrder, placeStopLossOrder, placeTakeProfitOrder ...
}
