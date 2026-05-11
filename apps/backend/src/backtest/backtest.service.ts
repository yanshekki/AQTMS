import { Injectable, Logger } from '@nestjs/common';
import { strategyRegistry } from './strategy.registry';
import { HistoricalDataService } from '../data/historical-data.service';
import { Candle, Signal } from './interfaces/strategy.interface';

// ... (keep existing interfaces)

export interface OptimizationRequest {
  strategyName: string;
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  paramRanges: Record<string, number[]>; // e.g. { shortPeriod: [5,10,15], longPeriod: [20,30,50] }
  feeRate?: number;
  slippageRate?: number;
}

export interface OptimizationResult {
  bestParams: Record<string, number>;
  bestMetrics: any;
  allResults: Array<{ params: Record<string, number>; metrics: any }>;
}

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(private readonly historicalDataService: HistoricalDataService) {}

  // Existing runBacktest method remains...

  async optimizeParameters(request: OptimizationRequest): Promise<OptimizationResult> {
    this.logger.log(`Running parameter optimization for ${request.strategyName}`);

    const paramKeys = Object.keys(request.paramRanges);
    const allCombinations = this.generateCombinations(request.paramRanges);

    let bestScore = -Infinity;
    let bestParams: Record<string, number> = {};
    let bestMetrics: any = {};
    const allResults: any[] = [];

    for (const params of allCombinations) {
      const backtestRequest = {
        strategyName: request.strategyName,
        strategyParams: params,
        symbol: request.symbol,
        startDate: request.startDate,
        endDate: request.endDate,
        initialCapital: request.initialCapital,
        feeRate: request.feeRate,
        slippageRate: request.slippageRate,
      };

      const result = await this.runBacktest(backtestRequest);

      // Score based on Sharpe + Profit Factor (customizable)
      const score = (result.sharpeRatio || 0) * 0.6 + (result.profitFactor || 0) * 0.4;

      allResults.push({ params, metrics: result });

      if (score > bestScore) {
        bestScore = score;
        bestParams = params;
        bestMetrics = result;
      }
    }

    this.logger.log(`Optimization complete. Best params: ${JSON.stringify(bestParams)}`);

    return {
      bestParams,
      bestMetrics,
      allResults: allResults.slice(0, 50), // limit results for response size
    };
  }

  private generateCombinations(ranges: Record<string, number[]>): Record<string, number>[] {
    const keys = Object.keys(ranges);
    if (keys.length === 0) return [{}];

    const firstKey = keys[0];
    const restKeys = keys.slice(1);
    const restCombinations = this.generateCombinations(
      Object.fromEntries(restKeys.map(k => [k, ranges[k]]))
    );

    const results: Record<string, number>[] = [];
    for (const value of ranges[firstKey]) {
      for (const rest of restCombinations) {
        results.push({ [firstKey]: value, ...rest });
      }
    }
    return results;
  }

  // ... keep existing private methods (calculateStdDev, getEmptyResult, etc.)
}
