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
    private readonly paperTradingService: PaperTradingService, // 注入 Paper Trading 服務
  ) {}

  onModuleInit() {
    console.log('[ExecutionService] Initialized with resilience + Paper Trading support');
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

    // 如果是 Paper Trading 模式，使用模擬下單
    if (dto.isPaperTrading) {
      const paperOrder = await this.paperTradingService.placePaperOrder({
        userId: dto.userId,
        symbol: dto.symbol,
        side: dto.side,
        quantity: dto.quantity,
        price: dto.price || 0,
      });

      return {
        success: true,
        mode: 'PAPER',
        order: paperOrder,
      };
    }

    // 真實交易模式（保留原有邏輯 + resilience）
    try {
      const mainOrder = await this.circuitBreaker.execute(() =>
        retry(() => this.placeMainOrder(dto), {
          retries: 3,
          delay: 800,
          factor: 2,
        }),
      );

      let stopLossOrder = null;
      if (dto.stopLoss) {
        stopLossOrder = await this.circuitBreaker.execute(() =>
          retry(() => this.placeStopLossOrder(dto), { retries: 2, delay: 600 }),
        );
      }

      let takeProfitOrder = null;
      if (dto.takeProfit) {
        takeProfitOrder = await this.circuitBreaker.execute(() =>
          retry(() => this.placeTakeProfitOrder(dto), { retries: 2, delay: 600 }),
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
      throw new OrderExecutionError(
        error instanceof Error ? error.message : '訂單執行失敗',
      );
    }
  }

  private async placeMainOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution] LIVE: Placing MAIN order ${dto.side} ${dto.quantity} ${dto.symbol}`);
    return { orderId: 'live-main-' + Date.now(), status: 'FILLED' };
  }

  private async placeStopLossOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution] LIVE: Placing STOP LOSS at ${dto.stopLoss}`);
    return { orderId: 'live-sl-' + Date.now(), status: 'NEW' };
  }

  private async placeTakeProfitOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution] LIVE: Placing TAKE PROFIT at ${dto.takeProfit}`);
    return { orderId: 'live-tp-' + Date.now(), status: 'NEW' };
  }
}
