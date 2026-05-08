import { Injectable, OnModuleInit } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { RiskCheckContext } from '../risk/interfaces/risk-rule.interface';
import { PositionSizingRule } from '../risk/rules/position-sizing.rule';
import { MaxDailyLossRule } from '../risk/rules/max-daily-loss.rule';

@Injectable()
export class ExecutionService implements OnModuleInit {
  constructor(private readonly riskService: RiskService) {}

  onModuleInit() {
    this.riskService.registerRule(new PositionSizingRule());
    this.riskService.registerRule(new MaxDailyLossRule());

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
    accountBalance?: number;
    currentDailyLoss?: number; // 今日已虧損金額
  }) {
    const context: RiskCheckContext = {
      userId: orderData.userId,
      exchange: orderData.exchange,
      symbol: orderData.symbol,
      side: orderData.side,
      quantity: orderData.quantity,
      price: orderData.price,
      accountBalance: orderData.accountBalance,
      ...(orderData.currentDailyLoss !== undefined && { currentDailyLoss: orderData.currentDailyLoss }),
    };

    const riskResult = await this.riskService.check(context);

    if (!riskResult.passed) {
      throw new Error(`Risk check failed: ${riskResult.reason}`);
    }

    const finalQuantity = riskResult.adjustedQuantity ?? orderData.quantity;

    console.log(
      `[ExecutionService] Risk passed. Placing order for ${finalQuantity} ${orderData.symbol}`,
    );

    return {
      success: true,
      executedQuantity: finalQuantity,
      riskResult,
    };
  }
}
