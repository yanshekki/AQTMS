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
import { OrderStatus } from '../order/interfaces/order-status.enum';

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
  ) {}

  onModuleInit() {
    console.log('[ExecutionService] OrderService integration enabled');
  }

  async placeOrderWithProtection(dto: PlaceOrderWithProtectionDto & { isPaperTrading?: boolean }) {
    // Kill Switch 檢查
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

    // === Live Trading with Order Management ===
    try {
      // 1. 先建立訂單記錄（狀態 NEW）
      const mainOrderRecord = this.orderService.createOrder({
        userId: dto.userId,
        exchange: dto.exchange,
        symbol: dto.symbol,
        side: dto.side,
        type: 'MARKET',
        quantity: dto.quantity,
        price: dto.price,
      });

      // 2. 執行真實下單（帶 Resilience）
      const mainOrderResult = await this.circuitBreaker.execute(() =>
        retry(() => this.placeMainOrder(dto), {
          retries: 3,
          delay: 1000,
          shouldRetry: (error) => this.isTransientError(error),
        }),
      );

      // 3. 更新訂單狀態為 FILLED（簡化版）
      this.orderService.updateOrderStatus(
        mainOrderRecord.id,
        OrderStatus.FILLED,
        dto.quantity,
        dto.price,
      );

      // Stop Loss / Take Profit 同樣建立記錄 + 更新狀態
      let stopLossOrderRecord = null;
      if (dto.stopLoss) {
        stopLossOrderRecord = this.orderService.createOrder({
          userId: dto.userId,
          exchange: dto.exchange,
          symbol: dto.symbol,
          side: dto.side === 'BUY' ? 'SELL' : 'BUY',
          type: 'STOP_LOSS',
          quantity: dto.quantity,
          stopPrice: dto.stopLoss,
        });

        await this.circuitBreaker.execute(() =>
          retry(() => this.placeStopLossOrder(dto), { retries: 2, delay: 800 }),
        );

        this.orderService.updateOrderStatus(stopLossOrderRecord.id, OrderStatus.NEW);
      }

      // ... Take Profit 同樣處理 ...

      return {
        success: true,
        mode: 'LIVE',
        mainOrder: mainOrderResult,
        mainOrderRecord,
        stopLossOrderRecord,
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
