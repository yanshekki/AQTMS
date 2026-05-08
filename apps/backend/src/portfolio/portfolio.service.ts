import { Injectable } from '@nestjs/common';

export interface PortfolioSummary {
  totalValue: number;           // 總資產價值（USDT）
  totalUnrealizedPnl: number;   // 總未實現盈虧
  totalRiskExposure: number;    // 風險暴露比例（%）
  positionCount: number;        // 持倉數量
  lastUpdated: Date;
}

export interface Position {
  symbol: string;
  exchange: string;
  side: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  isPaper: boolean;
}

@Injectable()
export class PortfolioService {
  /**
   * 獲取用戶 Portfolio 總覽（MVP 版本使用 mock 數據）
   */
  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    // TODO: 之後要聚合以下數據：
    // - 各交易所真實持倉 + 餘額
    // - Paper Trading 持倉 + 餘額
    // - 計算總價值與風險

    console.log(`[Portfolio] Generating summary for user: ${userId}`);

    // MVP Mock 數據
    return {
      totalValue: 12450.75,
      totalUnrealizedPnl: 385.5,
      totalRiskExposure: 42.3,
      positionCount: 4,
      lastUpdated: new Date(),
    };
  }

  /**
   * 獲取用戶所有持倉詳情（MVP）
   */
  async getPositions(userId: string): Promise<Position[]> {
    // TODO: 聚合真實交易所 + Paper Trading 持倉

    return [
      {
        symbol: 'BTCUSDT',
        exchange: 'BINANCE',
        side: 'BUY',
        quantity: 0.25,
        averagePrice: 64200,
        currentPrice: 65800,
        unrealizedPnl: 400,
        unrealizedPnlPercent: 2.49,
        isPaper: false,
      },
      {
        symbol: 'ETHUSDT',
        exchange: 'BYBIT',
        side: 'BUY',
        quantity: 4.5,
        averagePrice: 3050,
        currentPrice: 3120,
        unrealizedPnl: 315,
        unrealizedPnlPercent: 2.3,
        isPaper: true,
      },
    ];
  }
}
