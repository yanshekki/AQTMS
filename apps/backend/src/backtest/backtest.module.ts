import { Module, OnModuleInit } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { strategyRegistry } from './strategy/strategy.registry';
import { MovingAverageCrossStrategy } from './strategy/moving-average-cross.strategy';
import { MeanReversionStrategy } from './strategy/mean-reversion.strategy';

@Module({
  providers: [BacktestService],
  exports: [BacktestService],
})
export class BacktestModule implements OnModuleInit {
  onModuleInit() {
    strategyRegistry.register('ma-cross', MovingAverageCrossStrategy);
    strategyRegistry.register('mean-reversion', MeanReversionStrategy);

    // TODO: Register more strategies
  }
}
