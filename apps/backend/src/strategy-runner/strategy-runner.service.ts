import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionService } from '../execution/execution.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class StrategyRunnerService {
  private readonly logger = new Logger(StrategyRunnerService.name);
  private activeStrategies = new Map<string, { isRunning: boolean; lastRun?: Date }>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(forwardRef(() => ExecutionService)) private readonly executionService?: ExecutionService,
    @Optional() private readonly riskService?: RiskService,
  ) {}

  async deployStrategy(strategyId: string, userId: string, isPaper: boolean = true): Promise<{ success: boolean; message: string }> {
    const strategy = await this.prisma.strategy.findUnique({ where: { id: strategyId } });
    if (!strategy) {
      return { success: false, message: 'Strategy not found' };
    }

    this.activeStrategies.set(strategyId, { isRunning: true });
    this.logger.log(`Strategy ${strategy.name} (${strategy.type}) deployed and running (Paper: ${isPaper})`);

    return { success: true, message: `Strategy ${strategy.name} is now active.` };
  }

  async stopStrategy(strategyId: string): Promise<{ success: boolean; message: string }> {
    this.activeStrategies.delete(strategyId);
    this.logger.log(`Strategy ${strategyId} stopped`);
    return { success: true, message: 'Strategy stopped successfully.' };
  }

  isStrategyActive(strategyId: string): boolean {
    return this.activeStrategies.has(strategyId);
  }

  // Real scheduled runner - every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async runActiveStrategies() {
    if (this.activeStrategies.size === 0) return;

    this.logger.debug(`Running ${this.activeStrategies.size} active strategies...`);

    for (const [strategyId, state] of this.activeStrategies.entries()) {
      if (!state.isRunning) continue;

      try {
        const strategy = await this.prisma.strategy.findUnique({ where: { id: strategyId } });
        if (!strategy) continue;

        const params = JSON.parse(strategy.params || '{}');
        const shouldExecute = await this.evaluateStrategy(strategy.type, params, strategy.symbol || 'BTCUSDT');

        if (shouldExecute) {
          const orderData = {
            symbol: strategy.symbol || 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: params.quantity || 0.001,
            isPaper: true,
            userId: strategy.userId || 'demo-user',
            exchangeAccountId: 'demo-paper',
          };

          if (this.executionService) {
            await this.executionService.executeOrder(orderData);
            this.logger.log(`Strategy ${strategy.name} executed order for ${orderData.symbol}`);
          }
        }
      } catch (error) {
        this.logger.error(`Error running strategy ${strategyId}: ${error.message}`);
      }
    }
  }

  private async evaluateStrategy(strategyType: string, params: any, symbol: string): Promise<boolean> {
    const recentPrices = await this.getRecentPrices(symbol, 30);
    if (recentPrices.length < 15) return false;

    if (strategyType === 'sma_crossover') {
      const shortPeriod = params.shortPeriod || 5;
      const longPeriod = params.longPeriod || 20;

      const shortSMA = this.calculateSMA(recentPrices, shortPeriod);
      const longSMA = this.calculateSMA(recentPrices, longPeriod);
      const lastPrice = recentPrices[recentPrices.length - 1];

      // Bullish crossover signal
      return lastPrice > shortSMA && shortSMA > longSMA;
    }

    if (strategyType === 'mean_reversion') {
      const mean = this.calculateSMA(recentPrices, 15);
      const lastPrice = recentPrices[recentPrices.length - 1];
      const deviation = Math.abs(lastPrice - mean) / mean;
      return deviation > (params.threshold || 0.025);
    }

    // Fallback demo logic
    return Math.random() > 0.78;
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const slice = prices.slice(-period);
    return slice.reduce((sum, p) => sum + p, 0) / slice.length;
  }

  private async getRecentPrices(symbol: string, limit: number): Promise<number[]> {
    // TODO: Replace with real MarketDataService call
    const basePrice = 60000 + (Math.random() - 0.5) * 2500;
    return Array.from({ length: limit }, (_, i) =>
      basePrice + Math.sin(i / 4) * 280 + (Math.random() - 0.5) * 120
    );
  }
}
