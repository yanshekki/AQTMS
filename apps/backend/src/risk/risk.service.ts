import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RiskEvaluationResult {
  passed: boolean;
  reasons: string[];
  suggestedSize?: number;
  riskScore?: number; // 0-100, higher = riskier
  sizingMethod?: string;
}

export interface RiskRule {
  name: string;
  enabled: boolean;
  check: (orderData: any, context: any) => { passed: boolean; reason?: string } | Promise<{ passed: boolean; reason?: string }>;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);
  private customRules: RiskRule[] = [];

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    // Built-in production-grade risk rules (can be extended via DB or registerRiskRule)
    this.customRules = [
      {
        name: 'max_position_size',
        enabled: true,
        check: (orderData: any) => {
          const maxSize = orderData.maxPositionSize || 1000;
          if (orderData.quantity && orderData.quantity > maxSize) {
            return { passed: false, reason: `Quantity ${orderData.quantity} exceeds max position size ${maxSize}` };
          }
          return { passed: true };
        },
      },
      {
        name: 'daily_loss_limit',
        enabled: true,
        check: async (orderData: any, context: any) => {
          // In production: fetch real daily realizedPnL from PortfolioSnapshot or ExecutionLog
          const dailyLoss = context?.dailyLoss || 0; // mock, replace with real query
          const maxDailyLoss = orderData.maxDailyLoss || 5000;
          if (dailyLoss < -maxDailyLoss) {
            return { passed: false, reason: `Daily loss limit exceeded: ${dailyLoss} < -${maxDailyLoss}` };
          }
          return { passed: true };
        },
      },
      {
        name: 'kill_switch',
        enabled: true,
        check: async (orderData: any) => {
          // Check global or user kill switch (from DB flag or recent ExecutionLog)
          const killSwitchActive = false; // TODO: query from config or recent rejected orders count
          if (killSwitchActive) {
            return { passed: false, reason: 'Kill Switch is active - trading halted' };
          }
          return { passed: true };
        },
      },
      {
        name: 'cooldown_period',
        enabled: true,
        check: (orderData: any) => {
          // Mock last trade time check
          const lastTradeTime = orderData.lastTradeTimestamp || 0;
          const cooldownMs = (orderData.cooldownMinutes || 5) * 60 * 1000;
          if (Date.now() - lastTradeTime < cooldownMs) {
            return { passed: false, reason: 'Cooldown period active after recent trade' };
          }
          return { passed: true };
        },
      },
      {
        name: 'max_open_positions',
        enabled: true,
        check: (orderData: any, context: any) => {
          const currentOpen = context?.openPositionsCount || 0;
          const maxOpen = orderData.maxOpenPositions || 10;
          if (currentOpen >= maxOpen) {
            return { passed: false, reason: `Max open positions (${maxOpen}) reached` };
          }
          return { passed: true };
        },
      },
    ];
  }

  async evaluateRisk(orderData: any, context: any = {}): Promise<RiskEvaluationResult> {
    this.logger.log(`Evaluating comprehensive risk for order: ${orderData.symbol} ${orderData.side} qty=${orderData.quantity}`);

    const reasons: string[] = [];
    let passed = true;
    let riskScore = 0;

    // Run all enabled rules (sync + async)
    for (const rule of this.customRules) {
      if (!rule.enabled) continue;
      try {
        const result = await rule.check(orderData, context);
        if (!result.passed) {
          passed = false;
          reasons.push(`[${rule.name}] ${result.reason}`);
          riskScore += 20; // increase risk score per violation
        }
      } catch (e) {
        this.logger.warn(`Rule ${rule.name} check failed: ${e.message}`);
      }
    }

    // Additional quantitative risk metrics (demo - production would use real market data + portfolio)
    const quantity = orderData.quantity || 0;
    const price = orderData.price || 50000; // mock
    const notional = quantity * price;

    // Simple VaR-like check (demo)
    if (notional > 50000) {
      reasons.push('Notional value exceeds single-trade VaR threshold');
      riskScore += 15;
      passed = false;
    }

    // Kelly / position sizing suggestion
    const suggestedSize = this.calculatePositionSize(orderData, context);

    // Risk score normalization
    riskScore = Math.min(100, Math.max(0, riskScore + (notional > 10000 ? 10 : 0)));

    if (passed && riskScore > 70) {
      reasons.push('High risk score despite passing basic rules - consider reducing size');
    }

    const finalPassed = passed && riskScore < 80; // hard threshold

    if (!finalPassed && reasons.length === 0) {
      reasons.push('Order rejected due to high composite risk score');
    }

    this.logger.log(`Risk evaluation result: passed=${finalPassed}, riskScore=${riskScore}, reasons=${reasons.length}`);

    // Log to ExecutionLog for audit (production critical)
    await this.logRiskEvent(orderData, finalPassed, reasons, riskScore).catch(err => 
      this.logger.error('Failed to log risk event', err)
    );

    return {
      passed: finalPassed,
      reasons,
      suggestedSize,
      riskScore,
      sizingMethod: orderData.sizingMethod || 'kelly_atr_hybrid',
    };
  }

  private calculatePositionSize(orderData: any, context: any = {}): number {
    const accountBalance = context.accountBalance || 100000; // mock, real from PaperTrading or Exchange
    const riskPerTrade = orderData.riskPerTrade || 0.02; // 2% default
    const atr = orderData.atr || 500; // mock ATR, real from MarketDataService
    const method = orderData.sizingMethod || 'kelly_atr_hybrid';

    let size = 0;

    if (method === 'kelly' || method === 'kelly_atr_hybrid') {
      // Kelly Criterion simplified (winRate=0.55, winLossRatio=1.5 demo)
      const winRate = orderData.winRate || 0.55;
      const winLossRatio = orderData.winLossRatio || 1.5;
      const kellyFraction = (winRate * winLossRatio - (1 - winRate)) / winLossRatio;
      const kellySize = Math.max(0, Math.floor((kellyFraction * riskPerTrade) * accountBalance / (orderData.price || 1)));
      size = kellySize;
    }

    if (method === 'atr' || method === 'kelly_atr_hybrid') {
      // ATR-based sizing (risk 1 ATR per unit)
      const atrSize = Math.floor((accountBalance * riskPerTrade) / atr);
      size = Math.max(size, atrSize); // hybrid takes max sensible
    }

    if (method === 'fixed_fractional') {
      size = Math.floor((accountBalance * riskPerTrade) / (orderData.price || 1));
    }

    // Cap at max position
    const maxSize = orderData.maxPositionSize || 1000;
    size = Math.min(size, maxSize);

    this.logger.debug(`Position sizing (${method}): suggested=${size}`);
    return size || 10; // fallback
  }

  // Register dynamic rule at runtime (e.g. from admin UI or ScoringRule)
  registerRiskRule(ruleName: string, ruleFn: (data: any, context?: any) => { passed: boolean; reason?: string }) {
    this.customRules.push({
      name: ruleName,
      enabled: true,
      check: ruleFn,
    });
    this.logger.log(`Dynamically registered risk rule: ${ruleName}`);
  }

  async checkKillSwitch(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Production: check DB flag, or count recent EXECUTION_RISK_BLOCKED in ExecutionLog
    const recentBlocks = await this.prisma.executionLog.count({
      where: {
        userId,
        action: { contains: 'RISK_BLOCKED' },
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }).catch((err) => {
      this.logger.warn('Failed to count recent risk blocks for kill switch', err?.message);
      return 0;
    });

    if (recentBlocks > 5) {
      return { allowed: false, reason: 'Too many risk blocks today - Kill Switch engaged' };
    }
    return { allowed: true };
  }

  private async logRiskEvent(orderData: any, passed: boolean, reasons: string[], riskScore: number) {
    try {
      await this.prisma.executionLog.create({
        data: {
          userId: orderData.userId || 'demo-user',
          orderId: null,
          action: passed ? 'RISK_CHECK_PASSED' : 'RISK_CHECK_BLOCKED',
          details: {
            symbol: orderData.symbol,
            side: orderData.side,
            quantity: orderData.quantity,
            reasons,
            riskScore,
            timestamp: new Date(),
          } as any,
        },
      });
    } catch (e) {
      this.logger.error('Risk event logging failed (non-critical)', e.message);
    }
  }

  // Future: load persisted rules from DB (e.g. extend ScoringRule or new RiskRule model)
  async loadPersistedRules(userId: string) {
    // Example: this.prisma.riskRule.findMany({ where: { userId, enabled: true } })
    this.logger.log('Persisted risk rules load (TODO: implement full DB model)');
  }
}