import { Injectable, OnModuleInit } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { PlaceOrderWithProtectionDto } from './dto/place-order-with-protection.dto';
import { retry } from '../common/utils/retry.util';
import { CircuitBreaker } from '../common/circuit-breaker/circuit-breaker';
import { RiskCheckFailedError } from '../common/errors/risk.error';
import { OrderExecutionError } from '../common/errors/order.error';
import { PaperTradingService } from '../paper-trading/paper-trading.service';

@Injectable()
export class ExecutionService implements OnModuleInit {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
  });

  constructor(
    private readonly riskService: RiskService,
    private readonly paperTradingService: PaperTradingService,
  ) {}

  onModuleInit() {
    console.log('[ExecutionService] Live trading resilience enabled');
  }

  async placeOrderWithProtection(dto: PlaceOrderWithProtectionDto & { isPaperTrading?: boolean }) {
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

    // === Live Trading with enhanced resilience ===
    try {
      const mainOrder = await this.circuitBreaker.execute(() =>
        retry(
          () => this.placeMainOrder(dto),
          {
            retries: 3,
            delay: 1000,
            factor: 2,
            shouldRetry: (error) => this.isTransientError(error),
            onRetry: (error, attempt) => {
              console.warn(`[Execution] Retrying main order (attempt ${attempt})`, error?.message);
            },
          },
        ),
      );

      let stopLossOrder = null;
      if (dto.stopLoss) {
        stopLossOrder = await this.circuitBreaker.execute(() =>
          retry(() => this.placeStopLossOrder(dto), {
            retries: 2,
            delay: 800,
            shouldRetry: (error) => this.isTransientError(error),
          }),
        );
      }

      let takeProfitOrder = null;
      if (dto.takeProfit) {
        takeProfitOrder = await this.circuitBreaker.execute(() =>
          retry(() => this.placeTakeProfitOrder(dto), {
            retries: 2,
            delay: 800,
            shouldRetry: (error) => this.isTransientError(error),
          }),
        );
      }

      return {
        success: true,
        mode: 'LIVE',
        mainOrder,
        stopLossOrder,
        takeProfitOrder,
      };
    } catch (error) {
      if (error instanceof RiskCheckFailedError) throw error;
      throw new OrderExecutionError(error instanceof Error ? error.message : 'Live order execution failed');
    }
  }

  private isTransientError(error: any): boolean {
    const msg = (error?.message || '').toLowerCase();
    return ['timeout', 'econnreset', 'network', 'rate limit', '503', '429', 'temporary'].some((kw) => msg.includes(kw));
  }

  private async placeMainOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution][LIVE] Placing MAIN order: ${dto.side} ${dto.quantity} ${dto.symbol}`);
    // TODO: Call real exchange API
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
