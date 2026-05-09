import { Injectable } from '@nestjs/common';
import { IStrategy, Candle, Signal } from './interfaces/strategy.interface';
import { MovingAverageCrossoverStrategy } from './strategies/ma-crossover.strategy';

export interface BacktestRequest {
  symbol: string;
  exchange?: 'BINANCE' | 'BYBIT';
  startDate: string;
  endDate: string;
  strategyName: string;
  strategyParams?: Record<string, any>;
  initialCapital: number;
  interval?: string;
  feeRate?: number; // 手續費率，例如 0.001 = 0.1%
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
  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    const exchange = request.exchange || 'BINANCE';
    const interval = request.interval || '1h';
    const feeRate = request.feeRate ?? 0.001; // 預設 0.1%

    // TODO: 從 HistoricalDataService 獲取數據
    const candles: Candle[] = []; // 暫時為空，之後整合

    if (candles.length === 0) {
      // 返回 mock 結果（開發階段）
      return this.getMockResult(request.initialCapital);
    }

    let capital = request.initialCapital;
    let positionQty = 0;
    let entryPrice = 0;
    let trades = 0;
    let wins = 0;
    let totalFees = 0;
    let peakCapital = capital;
    let maxDrawdown = 0;

    // TODO: 建立策略並執行回測
    // ... (完整邏輯待補)

    return this.getMockResult(request.initialCapital, feeRate);
  }

  private getMockResult(initialCapital: number, feeRate = 0.001): BacktestResult {
    const finalCapital = initialCapital * 1.23;
    const totalFees = (initialCapital * 0.15) * feeRate; // 模擬手續費

    return {
      totalTrades: 38,
      winRate: 0.605,
      totalReturn: 0.23,
      maxDrawdown: 0.095,
      sharpeRatio: 1.52,
      finalCapital: parseFloat(finalCapital.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
    };
  }
}
