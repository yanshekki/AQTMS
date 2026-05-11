import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionService } from '../execution/execution.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class StrategyRunnerService {
  private readonly logger = new Logger(StrategyRunnerService.name);
  private activeStrategies = new Map<string, boolean>(); // strategyId -> isRunning

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

    this.activeStrategies.set(strategyId, true);
    this.logger.log(`Strategy ${strategy.name} deployed and running (Paper: ${isPaper})`);

    // In production, this would start a dedicated BullMQ job or persistent runner
    return { success: true, message: `Strategy ${strategy.name} is now active and running.` };
  }

  async stopStrategy(strategyId: string): Promise<{ success: boolean; message: string }> {
    this.activeStrategies.delete(strategyId);
    this.logger.log(`Strategy ${strategyId} stopped`);
    return { success: true, message: 'Strategy stopped successfully.' };
  }

  // Scheduled runner - runs every minute for active strategies
  @Cron(CronExpression.EVERY_MINUTE)
  async runActiveStrategies() {
    if (this.activeStrategies.size === 0) return;

    this.logger.debug(`Running ${this.activeStrategies.size} active strategies...`);

    for (const [strategyId, isActive] of this.activeStrategies.entries()) {
      if (!isActive) continue;

      try {
        // Demo logic: Simple momentum check (replace with real strategy logic)
        const shouldTrade = Math.random() > 0.7; // 30% chance to trigger (demo only)

        if (shouldTrade) {
          const orderData = {
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: 0.001,
            isPaper: true, // Always start in paper mode for safety
            userId: 'demo-user',
            exchangeAccountId: 'demo-paper',
          };

          if (this.executionService) {
            await this.executionService.executeOrder(orderData);
            this.logger.log(`Strategy ${strategyId} auto-executed order`);
          }
        }
      } catch (error) {
        this.logger.error(`Error running strategy ${strategyId}: ${error.message}`);
      }
    }
  }

  isStrategyActive(strategyId: string): boolean {
    return this.activeStrategies.has(strategyId);
  }
}
