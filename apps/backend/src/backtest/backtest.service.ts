import { Injectable, Logger } from '@nestjs/common';
import { strategyRegistry } from './strategy/strategy.registry';
import { HistoricalDataService } from '../data/historical-data.service';

export interface BacktestRequest {
  strategyName: string;
  strategyParams: Record<string, any>;
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  exchange?: 'BINANCE' | 'BYBIT';
  interval?: string;
  historicalBars?: Array<{
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
}

export interface BacktestResult {
  success: boolean;
  totalReturn: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgWin: number;
  avgLoss: number;
  finalCapital: number;
  equityCurve: number[];
  trades: any[];
}

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(private readonly historicalDataService: HistoricalDataService) {}

  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    this.logger.log(`Running backtest for strategy: ${request.strategyName}`);

    let bars = request.historicalBars;

    // Auto-fetch historical data if not provided
    if (!bars || bars.length === 0) {
      this.logger.log('No historical bars provided. Fetching from exchange...');

      const exchange = request.exchange || 'BINANCE';
      const interval = request.interval || '1h';

      const rawBars = await this.historicalDataService.getHistoricalData(
        exchange,
        request.symbol,
        interval,
        request.startDate.getTime(),
        request.endDate.getTime(),
      );

      bars = rawBars.map((b) => ({
        timestamp: new Date(b.timestamp),
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
      }));
    }

    if (!bars || bars.length === 0) {
      return this.getEmptyResult(request.initialCapital);
    }

    const strategy = strategyRegistry.getStrategy(request.strategyName);
    strategy.initialize(request.strategyParams);

    // ... rest of backtest logic (same as before) ...
    let capital = request.initialCapital;
    let position = 0;
    let entryPrice = 0;
    const equityCurve: number[] = [capital];
    const trades: any[] = [];
    const returns: number[] = [];

    let peak = capital;
    let maxDrawdown = 0;

    for (const bar of bars) {
      const signal = strategy.onBar(bar);

      if (signal.signal === 'BUY' && position === 0) {
        position = 1;
        entryPrice = bar.close;
        trades.push({ type: 'BUY', price: bar.close, timestamp: bar.timestamp });
      }

      if (signal.signal === 'SELL' && position === 1) {
        const pnl = (bar.close - entryPrice) * position;
        capital += pnl;
        trades.push({ type: 'SELL', price: bar.close, timestamp: bar.timestamp, pnl });
        position = 0;
      }

      equityCurve.push(capital);

      if (capital > peak) peak = capital;
      const drawdown = ((peak - capital) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      if (equityCurve.length > 1) {
        const prevEquity = equityCurve[equityCurve.length - 2];
        returns.push((capital - prevEquity) / prevEquity);
      }
    }

    if (position === 1 && bars.length > 0) {
      const lastBar = bars[bars.length - 1];
      const pnl = (lastBar.close - entryPrice) * position;
      capital += pnl;
      trades.push({ type: 'SELL', price: lastBar.close, timestamp: lastBar.timestamp, pnl });
    }

    const totalReturn = ((capital - request.initialCapital) / request.initialCapital) * 100;
    const winningTrades = trades.filter((t: any) => t.pnl > 0);
    const losingTrades = trades.filter((t: any) => t.pnl < 0);
    const totalTradesCount = trades.length;
    const winRate = totalTradesCount > 0 ? (winningTrades.length / totalTradesCount) * 100 : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = this.calculateStdDev(returns);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      success: true,
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      totalTrades: totalTradesCount,
      winRate: parseFloat(winRate.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      avgWin: parseFloat(avgWin.toFixed(2)),
      avgLoss: parseFloat(avgLoss.toFixed(2)),
      finalCapital: parseFloat(capital.toFixed(2)),
      equityCurve,
      trades,
    };
  }

  private calculateStdDev(returns: number[]): number {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private getEmptyResult(initialCapital: number): BacktestResult {
    return {
      success: false,
      totalReturn: 0,
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      avgWin: 0,
      avgLoss: 0,
      finalCapital: initialCapital,
      equityCurve: [initialCapital],
      trades: [],
    };
  }
}
