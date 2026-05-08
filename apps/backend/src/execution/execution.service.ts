import { Injectable, OnModuleInit } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { RiskCheckContext } from '../risk/interfaces/risk-rule.interface';
import { PositionSizingRule } from '../risk/rules/position-sizing.rule';

@Injectable()
export class ExecutionService implements OnModuleInit {
  constructor(private readonly riskService: RiskService) {}

  onModuleInit() {
    // 註冊 Position Sizing 規則
    this.riskService.registerRule(new PositionSizingRule());

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
    accountBalance?: number; // 傳入帳戶餘額
  }) {
    const context: RiskCheckContext = {
      userId: orderData.userId,
      exchange: orderData.exchange,
      symbol: orderData.symbol,
      side: orderData.side,
      quantity: orderData.quantity,
      price: orderData.price,
      accountBalance: orderData.accountBalance,
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
