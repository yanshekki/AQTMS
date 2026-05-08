import { Injectable, OnModuleInit } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { PlaceOrderWithProtectionDto } from './dto/place-order-with-protection.dto';
import { retry } from '../common/utils/retry.util';
import { CircuitBreaker } from '../common/circuit-breaker/circuit-breaker';
import { RiskCheckFailedError } from '../common/errors/risk.error';
import { ExchangeOrderError, OrderExecutionError } from '../common/errors/order.error';

@Injectable()
export class ExecutionService implements OnModuleInit {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
  });

  constructor(private readonly riskService: RiskService) {}

  onModuleInit() {
    console.log('[ExecutionService] Initialized with protection order + resilience + custom errors');
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
      throw new RiskCheckFailedError(riskResult.reason || '風險檢查未通過');
    }

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
        mainOrder,
        stopLossOrder,
        takeProfitOrder,
      };
    } catch (error) {
      if (error instanceof RiskCheckFailedError) {
        throw error;
      }
      throw new OrderExecutionError(
        error instanceof Error ? error.message : '訂單執行過程中發生未知錯誤',
      );
    }
  }

  private async placeMainOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution] Placing MAIN order: ${dto.side} ${dto.quantity} ${dto.symbol}`);
    // TODO: 真實交易所下單失敗時應拋出 ExchangeOrderError
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
