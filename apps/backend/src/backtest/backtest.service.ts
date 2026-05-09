import { Injectable } from '@nestjs/common';
import { IStrategy, Candle, Signal } from './interfaces/strategy.interface';
import { MovingAverageCrossoverStrategy } from './strategies/ma-crossover.strategy';
import { HistoricalDataService } from '../data/historical-data.service';

// ... existing interfaces

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  maxConsecutiveLosses: number;
  finalCapital: number;
  totalFees: number;
}

@Injectable()
export class BacktestService {
  constructor(private readonly historicalDataService: HistoricalDataService) {}

  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    // ... existing fetching and strategy initialization ...

    const tradePnls: number[] = [];
    const equityCurve: number[] = [capital];
    let currentConsecutiveLosses = 0;
    let maxConsecutiveLosses = 0;

    for (const candle of candles) {
      // ... existing logic ...

      if (signal.action === 'SELL' && positionQty > 0) {
        const sellValue = positionQty * candle.close;
        const pnl = sellValue - (positionQty * entryPrice);

        tradePnls.push(pnl);

        if (pnl < 0) {
          currentConsecutiveLosses++;
          maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
        } else {
          currentConsecutiveLosses = 0;
        }

        // ... rest of sell logic ...
      }

      // ... equity curve update ...
    }

    // ... existing Profit Factor and Sharpe calculation ...

    // Sortino Ratio (只考慮下行波動)
    const negativeReturns = returns.filter(r => r < 0);
    const downsideDeviation = negativeReturns.length > 0 
      ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length) 
      : 0.0001;
    const sortinoRatio = downsideDeviation > 0 ? (avgReturn / downsideDeviation) * Math.sqrt(252) : 0;

    return {
      totalTrades: trades,
      winRate: parseFloat(winRate.toFixed(4)),
      totalReturn: parseFloat(totalReturn.toFixed(4)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(4)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
      sortinoRatio: parseFloat(sortinoRatio.toFixed(3)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      maxConsecutiveLosses,
      finalCapital: parseFloat(finalCapital.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
    };
  }
}
