import { Injectable, Logger } from '@nestjs/common';
import { RiskParams } from '../../domain/value-objects/risk-params.vo';

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);
  private riskRules: Array<(order: any, context?: any) => boolean> = [];

  // In-memory daily loss tracking (in production, persist to DB or Redis)
  private dailyLossMap = new Map<string, { date: string; loss: number }>();

  registerRiskRule(ruleFn: (order: any, context?: any) => boolean): void {
    this.riskRules.push(ruleFn);
  }

  async evaluateRisk(order: any, context: any = {}): Promise<{ 
    passed: boolean; 
    reasons: string[]; 
    riskScore: number;
    suggestedSize?: number;
  }> {
    const reasons: string[] = [];
    let passed = true;
    let riskScore = 0.2;

    // Basic validation
    if (!order.symbol || !order.side || !order.quantity) {
      reasons.push('Missing required order fields (symbol, side, quantity)');
      passed = false;
    }

    if (order.quantity <= 0) {
      reasons.push('Quantity must be positive');
      passed = false;
    }

    // Advanced: Daily Loss Limit Check
    const userId = order.userId || context.userId || 'default';
    const today = new Date().toISOString().split('T')[0];
    const dailyData = this.dailyLossMap.get(userId);
    
    if (dailyData && dailyData.date === today) {
      const maxDailyLoss = context.maxDailyLoss || 500; // configurable
      if (dailyData.loss > maxDailyLoss) {
        reasons.push(`Daily loss limit exceeded ($${dailyData.loss.toFixed(2)} > $${maxDailyLoss})`);
        passed = false;
        riskScore = 0.9;
      }
    }

    // Advanced: Max Position Size Check
    const maxPositionSize = context.maxPositionSize || 0.1; // 10% of portfolio
    const portfolioValue = context.portfolioValue || 10000;
    const proposedValue = (order.price || 50000) * order.quantity;
    
    if (proposedValue > portfolioValue * maxPositionSize) {
      reasons.push(`Position size too large (>${(maxPositionSize * 100).toFixed(0)}% of portfolio)`);
      passed = false;
      riskScore = Math.max(riskScore, 0.7);
    }

    // Custom registered rules
    for (const rule of this.riskRules) {
      if (!rule(order, context)) {
        reasons.push('Custom risk rule failed');
        passed = false;
        riskScore = Math.max(riskScore, 0.6);
      }
    }

    // Advanced Risk Scoring (placeholder for Kelly / ATR / VaR)
    if (passed) {
      // TODO: Integrate real Kelly Criterion, ATR-based sizing, VaR calculation
      const kellyFraction = context.kellyFraction || 0.25; // conservative
      const suggestedSize = Math.floor((portfolioValue * kellyFraction) / (order.price || 50000));
      
      riskScore = 0.15 + (order.quantity / suggestedSize) * 0.3; // dynamic score
      
      this.logger.log(`Advanced risk check passed. Suggested size: ${suggestedSize}`);
    }

    return { 
      passed, 
      reasons, 
      riskScore: Math.min(1, Math.max(0, riskScore)),
      suggestedSize: passed ? Math.floor((context.portfolioValue || 10000) * 0.02 / (order.price || 50000)) : undefined
    };
  }

  // Update daily loss (call this after a losing trade)
  updateDailyLoss(userId: string, lossAmount: number): void {
    const today = new Date().toISOString().split('T')[0];
    const current = this.dailyLossMap.get(userId);
    
    if (current && current.date === today) {
      current.loss += lossAmount;
    } else {
      this.dailyLossMap.set(userId, { date: today, loss: lossAmount });
    }
    
    this.logger.log(`Daily loss updated for ${userId}: $${this.dailyLossMap.get(userId)?.loss}`);
  }

  // Reset daily loss (for testing or new day)
  resetDailyLoss(userId: string): void {
    this.dailyLossMap.delete(userId);
  }
}
