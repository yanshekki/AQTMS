import { Injectable } from '@nestjs/common';
import { IStrategy, Candle, Signal } from './interfaces/strategy.interface';
import { MovingAverageCrossoverStrategy } from './strategies/ma-crossover.strategy';
import { HistoricalDataService } from '../data/historical-data.service';

// ... existing interfaces (BacktestRequest, BacktestResult, etc.)

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
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
    const positionSizePercent = request.positionSizePercent ?? 0.95;

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

    let strategy: IStrategy;
    if (request.strategyName === 'MA_Crossover') {
      strategy = new MovingAverageCrossoverStrategy();
    } else {
      throw new Error(`Unknown strategy: ${request.strategyName}`);
    }

    strategy.initialize(request.strategyParams);

    let capital = request.initialCapital;
    let positionQty = 0;
    let entryPrice = 0;
    let trades = 0;
    let wins = 0;
    let totalFees = 0;

    const tradePnls: number[] = [];
    const equityCurve: number[] = [capital];
    let peakCapital = capital;
    let maxDrawdown = 0;

    for (const candle of candles) {
      const signal: Signal | null = strategy.onCandle(candle);

      if (!signal || signal.action === 'HOLD') {
        equityCurve.push(capital + positionQty * candle.close);
        continue;
      }

      const currentEquity = capital + positionQty * candle.close;

      if (signal.action === 'BUY' && positionQty === 0) {
        const investAmount = currentEquity * positionSizePercent;
        positionQty = investAmount / candle.close;
        entryPrice = candle.close;

        const fee = investAmount * feeRate;
        capital -= fee;
        totalFees += fee;
        trades++;
      } 
      else if (signal.action === 'SELL' && positionQty > 0) {
        const sellValue = positionQty * candle.close;
        const pnl = sellValue - (positionQty * entryPrice);

        tradePnls.push(pnl);
        capital += sellValue;

        const fee = sellValue * feeRate;
        capital -= fee;
        totalFees += fee;

        if (pnl > 0) wins++;
        positionQty = 0;
        trades++;
      }

      const newEquity = capital + positionQty * candle.close;
      equityCurve.push(newEquity);

      if (newEquity > peakCapital) peakCapital = newEquity;
      const drawdown = (peakCapital - newEquity) / peakCapital;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const finalCapital = capital + positionQty * (candles[candles.length - 1]?.close || 0);

    // Profit Factor
    const grossProfit = tradePnls.filter(p => p > 0).reduce((sum, p) => sum + p, 0);
    const grossLoss = Math.abs(tradePnls.filter(p => p < 0).reduce((sum, p) => sum + p, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);

    // Sharpe Ratio (annualized, assuming daily bars for simplicity)
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      if (equityCurve[i - 1] !== 0) {
        returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
      }
    }
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 0 ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length : 0;
    const stdDev = Math.sqrt(variance) || 0.0001;
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    const winRate = trades > 0 ? wins / trades : 0;
    const totalReturn = (finalCapital - request.initialCapital) / request.initialCapital;

    return {
      totalTrades: trades,
      winRate: parseFloat(winRate.toFixed(4)),
      totalReturn: parseFloat(totalReturn.toFixed(4)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(4)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      finalCapital: parseFloat(finalCapital.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
    };
  }

  // ... optimizeParameters and compareStrategies methods remain ...
}
