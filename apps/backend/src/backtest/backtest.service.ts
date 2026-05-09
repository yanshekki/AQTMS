import { Injectable } from '@nestjs/common';
import { IStrategy, Candle, Signal } from './interfaces/strategy.interface';
import { MovingAverageCrossoverStrategy } from './strategies/ma-crossover.strategy';

export interface BacktestRequest {
  symbol: string;
  startDate: string;
  endDate: string;
  strategyName: string;
  strategyParams?: Record<string, any>;
  initialCapital: number;
  candles: Candle[]; // 暫時由外部傳入，之後改成從 HistoricalDataService 獲取
}

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  finalCapital: number;
}

@Injectable()
export class BacktestService {
  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    console.log(`[Backtest] Running backtest for ${request.symbol} using ${request.strategyName}`);

    // 根據策略名稱建立策略實例
    let strategy: IStrategy;

    if (request.strategyName === 'MA_Crossover') {
      strategy = new MovingAverageCrossoverStrategy();
    } else {
      throw new Error(`Unknown strategy: ${request.strategyName}`);
    }

    strategy.initialize(request.strategyParams);

    let capital = request.initialCapital;
    let position = 0; // 持倉數量
    let entryPrice = 0;
    let trades = 0;
    let wins = 0;
    let peakCapital = capital;
    let maxDrawdown = 0;

    for (const candle of request.candles) {
      const signal: Signal | null = strategy.onCandle(candle);

      if (!signal || signal.action === 'HOLD') continue;

      if (signal.action === 'BUY' && position === 0) {
        // 買入
        position = 1;
        entryPrice = candle.close;
        trades++;
      } 
      else if (signal.action === 'SELL' && position > 0) {
        // 賣出
        const pnl = (candle.close - entryPrice) * position;
        capital += pnl;

        if (pnl > 0) wins++;

        // 計算最大回撤
        if (capital > peakCapital) peakCapital = capital;
        const drawdown = (peakCapital - capital) / peakCapital;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;

        position = 0;
        trades++;
      }
    }

    const winRate = trades > 0 ? wins / trades : 0;
    const totalReturn = (capital - request.initialCapital) / request.initialCapital;

    return {
      totalTrades: trades,
      winRate: parseFloat(winRate.toFixed(4)),
      totalReturn: parseFloat(totalReturn.toFixed(4)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(4)),
      sharpeRatio: 0, // TODO: 實作 Sharpe Ratio 計算
      finalCapital: parseFloat(capital.toFixed(2)),
    };
  }
}
