import { Injectable } from '@nestjs/common';
import { ExchangePosition, ExchangePositionProvider } from '../interfaces/exchange-position.provider';

/**
 * Bybit 持倉提供者（Phase 2.2 範例實現）
 */
@Injectable()
export class BybitPositionProvider implements ExchangePositionProvider {
  getExchangeName(): string {
    return 'BYBIT';
  }

  async getPositions(userId: string): Promise<ExchangePosition[]> {
    console.log(`[BybitPositionProvider] Fetching positions for user: ${userId}`);

    // TODO: 之後替換成真實 Bybit API 呼叫
    // 例如使用 ccxt 或 Bybit 官方 SDK

    return [
      {
        symbol: 'BTCUSDT',
        quantity: 1.2,
        side: 'BUY',
        entryPrice: 64800,
        unrealizedPnl: 180,
      },
      {
        symbol: 'SOLUSDT',
        quantity: 15,
        side: 'BUY',
        entryPrice: 145,
        unrealizedPnl: -32,
      },
    ];
  }
}
