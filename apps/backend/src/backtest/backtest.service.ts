import { Injectable } from '@nestjs/common';
import { IStrategy, Candle, Signal } from './interfaces/strategy.interface';
import { MovingAverageCrossoverStrategy } from './strategies/ma-crossover.strategy';
import { HistoricalDataService } from '../data/historical-data.service';

// ... existing interfaces

export interface StrategyConfig {
  name: string;
  strategyName: string;
  params?: Record<string, any>;
}

export interface StrategyComparisonResult {
  symbol: string;
  period: string;
  results: Array<{
    strategyName: string;
    params: Record<string, any>;
    result: BacktestResult;
  }>;
}

@Injectable()
export class BacktestService {
  constructor(private readonly historicalDataService: HistoricalDataService) {}

  // ... existing methods (runBacktest, optimizeParameters) ...

  /**
   * 多策略比較
   */
  async compareStrategies(
    baseRequest: Omit<BacktestRequest, 'strategyName' | 'strategyParams'>,
    strategies: StrategyConfig[],
  ): Promise<StrategyComparisonResult> {
    console.log(`[Backtest] Comparing ${strategies.length} strategies...`);

    const results: any[] = [];

    for (const strategyConfig of strategies) {
      const request: BacktestRequest = {
        ...baseRequest,
        strategyName: strategyConfig.strategyName,
        strategyParams: strategyConfig.params,
      };

      const result = await this.runBacktest(request);

      results.push({
        strategyName: strategyConfig.name,
        params: strategyConfig.params || {},
        result,
      });
    }

    // 按總報酬排序
    results.sort((a, b) => b.result.totalReturn - a.result.totalReturn);

    return {
      symbol: baseRequest.symbol,
      period: `${baseRequest.startDate} ~ ${baseRequest.endDate}`,
      results,
    };
  }
}
