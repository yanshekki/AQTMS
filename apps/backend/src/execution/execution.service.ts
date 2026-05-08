import { Injectable, OnModuleInit } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { PlaceOrderWithProtectionDto } from './dto/place-order-with-protection.dto';

@Injectable()
export class ExecutionService implements OnModuleInit {
  constructor(private readonly riskService: RiskService) {}

  onModuleInit() {
    // TODO: 從 Phase 1 遷移風險規則註冊
    console.log('[ExecutionService] Initialized with protection order support');
  }

  async placeOrderWithProtection(dto: PlaceOrderWithProtectionDto) {
    // 1. 風險檢查
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

    // 2. 下主單
    const mainOrder = await this.placeMainOrder(dto);

    // 3. 掛 Stop Loss（如果有設定）
    let stopLossOrder = null;
    if (dto.stopLoss) {
      stopLossOrder = await this.placeStopLossOrder(dto);
    }

    // 4. 掛 Take Profit（如果有設定）
    let takeProfitOrder = null;
    if (dto.takeProfit) {
      takeProfitOrder = await this.placeTakeProfitOrder(dto);
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
      `[Execution] Placing MAIN order: ${dto.side} ${dto.quantity} ${dto.symbol} @ ${dto.price || 'MARKET'}`,
    );
    // TODO: 呼叫真實交易所服務
    return {
      orderId: 'mock-main-' + Date.now(),
      status: 'FILLED',
      symbol: dto.symbol,
    };
  }

  private async placeStopLossOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution] Placing STOP LOSS at ${dto.stopLoss} for ${dto.symbol}`);
    // TODO: 呼叫交易所條件單 API
    return {
      orderId: 'mock-sl-' + Date.now(),
      status: 'NEW',
      stopPrice: dto.stopLoss,
    };
  }

  private async placeTakeProfitOrder(dto: PlaceOrderWithProtectionDto) {
    console.log(`[Execution] Placing TAKE PROFIT at ${dto.takeProfit} for ${dto.symbol}`);
    // TODO: 呼叫交易所條件單 API
    return {
      orderId: 'mock-tp-' + Date.now(),
      status: 'NEW',
      stopPrice: dto.takeProfit,
    };
  }
}
