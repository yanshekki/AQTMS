import { Injectable } from '@nestjs/common';
import { IStrategy, Candle, Signal } from './interfaces/strategy.interface';
import { MovingAverageCrossoverStrategy } from './strategies/ma-crossover.strategy';
import { HistoricalDataService } from '../data/historical-data.service';

export interface BacktestRequest {
  symbol: string;
  exchange?: 'BINANCE' | 'BYBIT';
  startDate: string;
  endDate: string;
  strategyName: string;
  strategyParams?: Record<string, any>;
  initialCapital: number;
  interval?: string; // e.g. '1h', '4h', '1d'
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
  constructor(private readonly historicalDataService: HistoricalDataService) {}

  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    const exchange = request.exchange || 'BINANCE';
    const interval = request.interval || '1h';

    console.log(`[Backtest] Fetching data for ${request.symbol} from ${exchange}...`);

    // 轉換日期為 timestamp
    const startTime = new Date(request.startDate).getTime();
    const endTime = new Date(request.endDate).getTime();

    // 獲取歷史數據
    const candles = await this.historicalDataService.getHistoricalData(
      exchange,
      request.symbol,
      interval,
      startTime,
      endTime,
    );

    if (candles.length === 0) {
      throw new Error('No historical data found for the given period');
    }

    console.log(`[Backtest] Loaded ${candles.length} candles. Running strategy...`);

    // 建立策略
    let strategy: IStrategy;
    if (request.strategyName === 'MA_Crossover') {
      strategy = new MovingAverageCrossoverStrategy();
    } else {
      throw new Error(`Unknown strategy: ${request.strategyName}`);
    }

    strategy.initialize(request.strategyParams);

    // 執行回測邏輯（簡化版）
    let capital = request.initialCapital;
    let position = 0;
    let entryPrice = 0;
    let trades = 0;
    let wins = 0;
    let peakCapital = capital;
    let maxDrawdown = 0;

    for (const candle of candles) {
      const signal: Signal | null = strategy.onCandle(candle);

      if (!signal || signal.action === 'HOLD') continue;

      if (signal.action === 'BUY' && position === 0) {
        position = 1;
        entryPrice = candle.close;
        trades++;
      } else if (signal.action === 'SELL' && position > 0) {
        const pnl = (candle.close - entryPrice) * position;
        capital += pnl;

        if (pnl > 0) wins++;

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
      sharpeRatio: 0,
      finalCapital: parseFloat(capital.toFixed(2)),
    };
  }
}
