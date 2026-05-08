import { Injectable } from '@nestjs/common';

// 之後可以從 exchange module 注入
// import { BinanceService } from '../exchange/binance.service';
// import { BybitService } from '../exchange/bybit.service';

export interface PositionDifference {
  symbol: string;
  systemQuantity: number;
  exchangeQuantity: number;
  difference: number;
  side?: string;
}

export interface ReconciliationResult {
  userId: string;
  timestamp: Date;
  totalPositions: number;
  differences: PositionDifference[];
  hasDiscrepancy: boolean;
}

@Injectable()
export class ReconciliationService {
  // TODO: 注入真實的交易所服務
  // constructor(
  //   private readonly binanceService: BinanceService,
  //   private readonly bybitService: BybitService,
  // ) {}

  /**
   * 對指定用戶進行倉位對帳
   */
  async reconcilePositions(userId: string, exchange?: string): Promise<ReconciliationResult> {
    console.log(`[Reconciliation] Starting reconciliation for user: ${userId}`);

    // TODO: 從系統內部獲取用戶持倉（目前 mock）
    const systemPositions = this.getSystemPositions(userId);

    // TODO: 從真實交易所獲取持倉
    const exchangePositions = await this.getExchangePositions(userId, exchange);

    // 進行比對
    const differences = this.comparePositions(systemPositions, exchangePositions);

    const result: ReconciliationResult = {
      userId,
      timestamp: new Date(),
      totalPositions: exchangePositions.length,
      differences,
      hasDiscrepancy: differences.length > 0,
    };

    if (result.hasDiscrepancy) {
      console.warn(`[Reconciliation] Found discrepancies for user ${userId}:`, differences);
    } else {
      console.log(`[Reconciliation] Positions are in sync for user ${userId}`);
    }

    return result;
  }

  /**
   * 從系統內部獲取持倉（Phase 2.2 暫時 mock）
   */
  private getSystemPositions(userId: string) {
    // TODO: 之後從資料庫或倉位服務獲取
    return [
      { symbol: 'BTCUSDT', quantity: 0.5, side: 'BUY' },
      { symbol: 'ETHUSDT', quantity: 2.0, side: 'BUY' },
    ];
  }

  /**
   * 從交易所獲取最新持倉
   * 目前為 mock，之後替換成真實 API 呼叫
   */
  private async getExchangePositions(userId: string, exchange?: string) {
    // TODO: 這裡應該根據 exchange 類型呼叫對應的 service
    // 例如：
    // if (exchange === 'BINANCE') return this.binanceService.getPositions(userId);
    // if (exchange === 'BYBIT') return this.bybitService.getPositions(userId);

    console.log(`[Reconciliation] Fetching positions from exchange for user ${userId}...`);

    // Mock 數據
    return [
      { symbol: 'BTCUSDT', quantity: 0.5, side: 'BUY' },
      { symbol: 'ETHUSDT', quantity: 1.8, side: 'BUY' }, // 故意與系統不同
    ];
  }

  /**
   * 比對系統持倉與交易所持倉
   */
  private comparePositions(systemPositions: any[], exchangePositions: any[]): PositionDifference[] {
    const differences: PositionDifference[] = [];

    // 簡單比對邏輯（之後可以加強）
    for (const exchangePos of exchangePositions) {
      const systemPos = systemPositions.find((p: any) => p.symbol === exchangePos.symbol);

      if (!systemPos) {
        differences.push({
          symbol: exchangePos.symbol,
          systemQuantity: 0,
          exchangeQuantity: exchangePos.quantity,
          difference: exchangePos.quantity,
        });
        continue;
      }

      const diff = systemPos.quantity - exchangePos.quantity;
      if (Math.abs(diff) > 0.0001) {
        differences.push({
          symbol: exchangePos.symbol,
          systemQuantity: systemPos.quantity,
          exchangeQuantity: exchangePos.quantity,
          difference: diff,
        });
      }
    }

    return differences;
  }

  async reconcileAllUsers(): Promise<void> {
    console.log('[Reconciliation] reconcileAllUsers - TODO');
  }
}
