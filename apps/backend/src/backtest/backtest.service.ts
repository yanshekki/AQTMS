import { Injectable, Logger } from '@nestjs/common';
import { strategyRegistry } from './strategy/strategy.registry';

export interface BacktestRequest {
  strategyName: string;
  strategyParams: Record<string, any>;
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
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
  maxDrawdown: number;
  finalCapital: number;
  equityCurve: number[];
  trades: any[];
}

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    this.logger.log(`Running backtest for strategy: ${request.strategyName}`);

    // 1. Get strategy from registry
    const strategy = strategyRegistry.getStrategy(request.strategyName);
    strategy.initialize(request.strategyParams);

    if (!request.historicalBars || request.historicalBars.length === 0) {
      return {
        success: false,
        totalReturn: 0,
        totalTrades: 0,
        winRate: 0,
        maxDrawdown: 0,
        finalCapital: request.initialCapital,
        equityCurve: [request.initialCapital],
        trades: [],
      };
    }

    // 2. Run strategy over historical data
    let capital = request.initialCapital;
    let position = 0;
    let entryPrice = 0;
    const equityCurve: number[] = [capital];
    const trades: any[] = [];

    for (const bar of request.historicalBars) {
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
    }

    // Close any open position at the end
    if (position === 1 && request.historicalBars.length > 0) {
      const lastBar = request.historicalBars[request.historicalBars.length - 1];
      const pnl = (lastBar.close - entryPrice) * position;
      capital += pnl;
      trades.push({ type: 'SELL', price: lastBar.close, timestamp: lastBar.timestamp, pnl });
    }

    const totalReturn = ((capital - request.initialCapital) / request.initialCapital) * 100;
    const winningTrades = trades.filter((t: any) => t.pnl > 0).length;
    const totalTradesCount = trades.length;

    return {
      success: true,
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      totalTrades: totalTradesCount,
      winRate: totalTradesCount > 0 ? parseFloat(((winningTrades / totalTradesCount) * 100).toFixed(2)) : 0,
      maxDrawdown: 0, // TODO: implement proper drawdown calculation
      finalCapital: parseFloat(capital.toFixed(2)),
      equityCurve,
      trades,
    };
  }
}
