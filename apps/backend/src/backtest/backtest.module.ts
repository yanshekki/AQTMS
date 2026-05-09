import { Module, OnModuleInit } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { strategyRegistry } from './strategy/strategy.registry';
import { MovingAverageCrossStrategy } from './strategy/moving-average-cross.strategy';

@Module({
  providers: [BacktestService],
  exports: [BacktestService],
})
export class BacktestModule implements OnModuleInit {
  onModuleInit() {
    // Register built-in strategies
    strategyRegistry.register('ma-cross', MovingAverageCrossStrategy);

    // TODO: Register more strategies here (e.g. AI Score, Mean Reversion, etc.)
  }
}
