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

        // Require real market data service - no more mock prices
        // TODO: Inject real MarketDataService and use getRecentPrices(symbol, limit)
        this.logger.warn(`StrategyRunner: Real market data integration required for ${strategy.name}. Skipping execution until MarketDataService is connected.`);
        continue; // Do not execute with mock data

      } catch (error) {
        this.logger.error(`Error running strategy ${strategyId}: ${error.message}`);
      }
    }
  }
}
