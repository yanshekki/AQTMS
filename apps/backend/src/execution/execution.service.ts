import { Injectable, OnModuleInit } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { RiskCheckContext } from '../risk/interfaces/risk-rule.interface';
import { MaxPositionSizeRule } from '../risk/rules/example-risk-rule';

@Injectable()
export class ExecutionService implements OnModuleInit {
  constructor(private readonly riskService: RiskService) {}

  onModuleInit() {
    // 在模塊初始化時註冊風險規則
    // Phase 1 先用範例規則，之後會替換成真正規則
    this.riskService.registerRule(new MaxPositionSizeRule());

    console.log(
      '[ExecutionService] Registered rules:',
      this.riskService.getRegisteredRules(),
    );
  }

  async placeOrder(orderData: {
    userId: string;
    exchange: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
  }) {
    const context: RiskCheckContext = {
      userId: orderData.userId,
      exchange: orderData.exchange,
      symbol: orderData.symbol,
      side: orderData.side,
      quantity: orderData.quantity,
      price: orderData.price,
    };

    // 執行風險檢查
    const riskResult = await this.riskService.check(context);

    if (!riskResult.passed) {
      throw new Error(`Risk check failed: ${riskResult.reason}`);
    }

    // 使用調整後的倉位大小（如果有）
    const finalQuantity = riskResult.adjustedQuantity ?? orderData.quantity;

    // TODO: 之後在這裡呼叫真正嘅交易所下單邏輯
    console.log(`[ExecutionService] Risk passed. Placing order for ${finalQuantity} ${orderData.symbol}`);

    return {
      success: true,
      executedQuantity: finalQuantity,
      riskResult,
    };
  }
}
