import { Injectable } from '@nestjs/common';

export interface BacktestRequest {
  symbol: string;
  startDate: string;
  endDate: string;
  strategy: string;           // 策略名稱
  initialCapital: number;
  // 之後可擴充 risk parameters 等
}

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  finalCapital: number;
  // 之後可加入詳細交易記錄
}

@Injectable()
export class BacktestService {
  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    console.log(`[Backtest] Starting backtest for ${request.symbol} from ${request.startDate} to ${request.endDate}`);

    // TODO: 實作真正的回測邏輯
    // 1. 獲取歷史數據
    // 2. 執行策略
    // 3. 計算績效指標

    // 目前返回 mock 結果
    return {
      totalTrades: 42,
      winRate: 0.62,
      totalReturn: 0.184,
      maxDrawdown: 0.087,
      sharpeRatio: 1.45,
      finalCapital: request.initialCapital * 1.184,
    };
  }
}
