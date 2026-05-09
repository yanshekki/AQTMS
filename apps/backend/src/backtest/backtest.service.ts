import { Injectable } from '@nestjs/common';
import { IStrategy, Candle, Signal } from './interfaces/strategy.interface';
import { MovingAverageCrossoverStrategy } from './strategies/ma-crossover.strategy';
import { HistoricalDataService } from '../data/historical-data.service';

// ... existing interfaces

export interface OptimizationResult {
  bestParams: Record<string, any>;
  bestResult: BacktestResult;
  allResults: Array<{
    params: Record<string, any>;
    result: BacktestResult;
  }>;
}

@Injectable()
export class BacktestService {
  constructor(private readonly historicalDataService: HistoricalDataService) {}

  // ... existing runBacktest method ...

  /**
   * 參數優化（簡單 Grid Search）
   */
  async optimizeParameters(
    baseRequest: Omit<BacktestRequest, 'strategyParams'>,
    paramRanges: Record<string, number[]>, // 例如 { shortPeriod: [5,10,15], longPeriod: [20,30,40] }
  ): Promise<OptimizationResult> {
    console.log('[Backtest] Starting parameter optimization...');

    const paramNames = Object.keys(paramRanges);
    const paramValues = Object.values(paramRanges);

    // 產生所有參數組合
    const combinations = this.generateCombinations(paramValues);

    let bestResult: BacktestResult | null = null;
    let bestParams: Record<string, any> = {};
    const allResults: any[] = [];

    for (const combo of combinations) {
      const params: Record<string, any> = {};
      paramNames.forEach((name, i) => {
        params[name] = combo[i];
      });

      const request: BacktestRequest = {
        ...baseRequest,
        strategyParams: params,
      };

      const result = await this.runBacktest(request);

      allResults.push({ params, result });

      // 以 totalReturn 為主要排序指標
      if (!bestResult || result.totalReturn > bestResult.totalReturn) {
        bestResult = result;
        bestParams = params;
      }
    }

    // 排序結果（由高到低）
    allResults.sort((a, b) => b.result.totalReturn - a.result.totalReturn);

    console.log(`[Backtest] Optimization done. Best params:`, bestParams);

    return {
      bestParams,
      bestResult: bestResult!,
      allResults,
    };
  }

  /**
   * 產生所有參數組合
   */
  private generateCombinations(arrays: number[][]): number[][] {
    if (arrays.length === 0) return [[]];

    const [first, ...rest] = arrays;
    const restCombinations = this.generateCombinations(rest);

    const result: number[][] = [];
    for (const value of first) {
      for (const combo of restCombinations) {
        result.push([value, ...combo]);
      }
    }
    return result;
  }
}
