import { Injectable } from '@nestjs/common';

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
  /**
   * 對指定用戶進行倉位對帳
   * Phase 2.2 MVP 版本：目前為 mock 實現
   */
  async reconcilePositions(userId: string): Promise<ReconciliationResult> {
    console.log(`[Reconciliation] Starting position reconciliation for user: ${userId}`);

    // TODO: 之後這裡要：
    // 1. 從系統內部獲取用戶持倉記錄
    // 2. 從交易所 API 獲取最新持倉
    // 3. 進行比對

    // 目前為 mock 數據
    const mockResult: ReconciliationResult = {
      userId,
      timestamp: new Date(),
      totalPositions: 2,
      differences: [
        {
          symbol: 'BTCUSDT',
          systemQuantity: 0.5,
          exchangeQuantity: 0.5,
          difference: 0,
        },
        {
          symbol: 'ETHUSDT',
          systemQuantity: 2.0,
          exchangeQuantity: 1.8,
          difference: 0.2,
        },
      ],
      hasDiscrepancy: true,
    };

    if (mockResult.hasDiscrepancy) {
      console.warn(
        `[Reconciliation] Found ${mockResult.differences.length} discrepancies for user ${userId}`,
      );
    } else {
      console.log(`[Reconciliation] No discrepancies found for user ${userId}`);
    }

    return mockResult;
  }

  /**
   * 對所有用戶進行對帳（之後可做成定時任務）
   */
  async reconcileAllUsers(): Promise<void> {
    console.log('[Reconciliation] Starting reconciliation for all users...');
    // TODO: 實現全用戶對帳邏輯
  }
}
