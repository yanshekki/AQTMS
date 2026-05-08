import { Injectable, OnModuleInit } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { PlaceOrderWithProtectionDto } from './dto/place-order-with-protection.dto';
import { retry } from '../common/utils/retry.util';
import { CircuitBreaker } from '../common/circuit-breaker/circuit-breaker';

@Injectable()
export class ExecutionService implements OnModuleInit {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
  });

  constructor(private readonly riskService: RiskService) {}

  onModuleInit() {
    console.log('[ExecutionService] Initialized with protection order + resilience support');
  }

  async placeOrderWithProtection(dto: PlaceOrderWithProtectionDto) {
    const riskResult = await this.riskService.check({
      userId: dto.userId,
      exchange: dto.exchange,
      symbol: dto.symbol,
      side: dto.side,
      quantity: dto.quantity,
      price: dto.price,
    });

    if (!riskResult.passed) {
      throw new Error(`Risk check failed: ${riskResult.reason}`);
    }

    // 使用 Circuit Breaker + Retry 包裝主單下單
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
      mainOrder,
      stopLossOrder,
      takeProfitOrder,
    };
  }

  private async placeMainOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(
      `[Execution] Placing MAIN order: ${dto.side} ${dto.quantity} ${dto.symbol}`,
    );
    // TODO: 呼叫真實交易所服務
    return { orderId: 'mock-main-' + Date.now(), status: 'FILLED' };
  }

  private async placeStopLossOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution] Placing STOP LOSS at ${dto.stopLoss}`);
    return { orderId: 'mock-sl-' + Date.now(), status: 'NEW' };
  }

  private async placeTakeProfitOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution] Placing TAKE PROFIT at ${dto.takeProfit}`);
    return { orderId: 'mock-tp-' + Date.now(), status: 'NEW' };
  }
}
