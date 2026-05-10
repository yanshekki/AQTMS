import { Injectable, Logger } from '@nestjs/common';

export interface PositionSizeParams {
  accountBalance: number;
  riskPerTrade: number; // e.g. 0.01 for 1%
  entryPrice: number;
  stopLossPrice: number;
  maxPositionPct?: number; // e.g. 0.3 for 30% of account
}

export interface RiskCheckResult {
  allowed: boolean;
  suggestedSize?: number;
  violations: string[];
  riskScore?: number;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  /**
   * Calculate position size using fixed fractional / risk based method
   */
  calculatePositionSize(params: PositionSizeParams): number {
    const { accountBalance, riskPerTrade, entryPrice, stopLossPrice, maxPositionPct = 0.3 } = params;

    if (entryPrice <= 0 || stopLossPrice <= 0 || accountBalance <= 0) {
      throw new Error('Invalid parameters for position sizing');
    }

    const riskPerUnit = Math.abs(entryPrice - stopLossPrice);
    if (riskPerUnit === 0) {
      return 0;
    }

    const riskAmount = accountBalance * riskPerTrade;
    let positionSize = riskAmount / riskPerUnit;

    // Apply max position limit
    const maxPositionValue = accountBalance * maxPositionPct;
    const maxSizeByValue = maxPositionValue / entryPrice;
    positionSize = Math.min(positionSize, maxSizeByValue);

    this.logger.debug(`Calculated position size: ${positionSize}`);
    return Math.floor(positionSize * 100) / 100; // round to 2 decimals
  }

  /**
   * Basic pre-trade risk evaluation
   */
  evaluateTradeRisk(params: {
    symbol: string;
    quantity: number;
    price: number;
    accountBalance: number;
    currentPositions: any[]; // simplified
    dailyPnL?: number;
    maxDailyLoss?: number;
  }): RiskCheckResult {
    const violations: string[] = [];
    const { symbol, quantity, price, accountBalance, currentPositions, dailyPnL = 0, maxDailyLoss = -0.05 } = params;

    const tradeValue = quantity * price;
    const positionPct = tradeValue / accountBalance;

    // Simple checks
    if (positionPct > 0.3) {
      violations.push('Position exceeds 30% of account balance');
    }

    if (dailyPnL < accountBalance * maxDailyLoss) {
      violations.push('Daily loss limit reached');
    }

    // Mock VaR or risk score
    const riskScore = Math.min(100, positionPct * 200 + (dailyPnL < 0 ? 30 : 0));

    const allowed = violations.length === 0;

    return {
      allowed,
      suggestedSize: allowed ? quantity : this.calculatePositionSize({
        accountBalance,
        riskPerTrade: 0.01,
        entryPrice: price,
        stopLossPrice: price * 0.95, // assume 5% SL
      }),
      violations,
      riskScore,
    };
  }

  /**
   * ATR based position sizing (simplified)
   */
  calculateATRPositionSize(
    accountBalance: number,
    atr: number,
    riskPerTrade: number,
    multiplier = 1.5,
  ): number {
    if (atr <= 0) return 0;
    const riskAmount = accountBalance * riskPerTrade;
    return (riskAmount / (atr * multiplier));
  }

  // TODO: Add VaR, CVaR, Kelly criterion portfolio optimization in later steps
}