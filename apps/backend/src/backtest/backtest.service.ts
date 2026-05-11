import { Injectable, Logger } from '@nestjs/common';
import { strategyRegistry } from './strategy.registry';
import { HistoricalDataService } from '../data/historical-data.service';
import { Candle, Signal } from './interfaces/strategy.interface';

export interface BacktestRequest {
  strategyName: string;
  strategyParams: Record<string, any>;
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  historicalBars?: Candle[];
  exchange?: 'BINANCE' | 'BYBIT';
  interval?: string;
  feeRate?: number;
  slippageRate?: number;
}

export interface BacktestResult {
  success: boolean;
  totalReturn: number;
  netReturn: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;      // New
  expectancy: number;        // New
  maxConsecutiveWins: number; // New
  maxConsecutiveLosses: number; // New
  avgWin: number;
  avgLoss: number;
  finalCapital: number;
  totalFees: number;
  equityCurve: number[];
  trades: any[];
}

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(private readonly historicalDataService: HistoricalDataService) {}

  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    // ... (existing logic with fees and slippage)
    // For brevity, I'll assume the core loop is similar to previous enhancement

    // After the main loop calculations...

    // Calculate advanced metrics
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDeviation = this.calculateStdDev(downsideReturns);
    const sortinoRatio = downsideDeviation > 0 ? (avgReturn / downsideDeviation) * Math.sqrt(252) : 0;

    // Expectancy
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * Math.abs(avgLoss);

    // Streak analysis
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (const trade of trades) {
      if ((trade.pnl || 0) > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else if ((trade.pnl || 0) < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
    }

    return {
      success: true,
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      netReturn: parseFloat(netReturn.toFixed(2)),
      totalTrades: totalTradesCount,
      winRate: parseFloat(winRate.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
      expectancy: parseFloat(expectancy.toFixed(2)),
      maxConsecutiveWins: maxWinStreak,
      maxConsecutiveLosses: maxLossStreak,
      avgWin: parseFloat(avgWin.toFixed(2)),
      avgLoss: parseFloat(avgLoss.toFixed(2)),
      finalCapital: parseFloat(capital.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
      equityCurve,
      trades,
    };
  }

  // ... (keep calculateStdDev and getEmptyResult)
}
