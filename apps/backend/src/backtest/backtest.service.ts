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
  interval?: string;
  feeRate?: number;
  positionSizePercent?: number; // 每次交易使用資金比例
}

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  finalCapital: number;
  totalFees: number;
}

@Injectable()
export class BacktestService {
  constructor(private readonly historicalDataService: HistoricalDataService) {}

  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    const exchange = request.exchange || 'BINANCE';
    const interval = request.interval || '1h';
    const feeRate = request.feeRate ?? 0.001;
    const positionSizePercent = request.positionSizePercent ?? 0.95; // 預設用 95% 資金

    const startTime = new Date(request.startDate).getTime();
    const endTime = new Date(request.endDate).getTime();

    const candles = await this.historicalDataService.getHistoricalData(
      exchange,
      request.symbol,
      interval,
      startTime,
      endTime,
    );

    if (candles.length === 0) {
      throw new Error('No historical data found');
    }

    // 建立策略
    let strategy: IStrategy;
    if (request.strategyName === 'MA_Crossover') {
      strategy = new MovingAverageCrossoverStrategy();
    } else {
      throw new Error(`Unknown strategy: ${request.strategyName}`);
    }

    strategy.initialize(request.strategyParams);

    // 初始化回測變數
    let capital = request.initialCapital;
    let positionQty = 0;
    let entryPrice = 0;
    let trades = 0;
    let wins = 0;
    let totalFees = 0;

    const equityCurve: number[] = [capital];
    let peakCapital = capital;
    let maxDrawdown = 0;

    for (const candle of candles) {
      const signal: Signal | null = strategy.onCandle(candle);

      if (!signal || signal.action === 'HOLD') {
        equityCurve.push(capital + positionQty * candle.close);
        continue;
      }

      // 計算當前權益
      const currentEquity = capital + positionQty * candle.close;

      if (signal.action === 'BUY' && positionQty === 0) {
        // 使用部分資金買入
        const investAmount = currentEquity * positionSizePercent;
        positionQty = investAmount / candle.close;
        entryPrice = candle.close;

        // 扣手續費
        const fee = investAmount * feeRate;
        capital -= fee;
        totalFees += fee;

        trades++;
      } 
      else if (signal.action === 'SELL' && positionQty > 0) {
        // 賣出
        const sellValue = positionQty * candle.close;
        const pnl = sellValue - (positionQty * entryPrice);

        capital += sellValue;
        const fee = sellValue * feeRate;
        capital -= fee;
        totalFees += fee;

        if (pnl > 0) wins++;

        positionQty = 0;
        trades++;
      }

      // 更新權益曲線與最大回撤
      const newEquity = capital + positionQty * candle.close;
      equityCurve.push(newEquity);

      if (newEquity > peakCapital) peakCapital = newEquity;
      const drawdown = (peakCapital - newEquity) / peakCapital;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const finalCapital = capital + positionQty * (candles[candles.length - 1]?.close || 0);
    const winRate = trades > 0 ? wins / trades : 0;
    const totalReturn = (finalCapital - request.initialCapital) / request.initialCapital;

    return {
      totalTrades: trades,
      winRate: parseFloat(winRate.toFixed(4)),
      totalReturn: parseFloat(totalReturn.toFixed(4)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(4)),
      sharpeRatio: 0, // TODO
      finalCapital: parseFloat(finalCapital.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
    };
  }
}
