import { Injectable } from '@nestjs/common';
import { ExchangePosition, ExchangePositionProvider } from '../interfaces/exchange-position.provider';

/**
 * Binance 持倉提供者（Phase 2.2 範例實現）
 *
 * 之後這裡會真正呼叫 Binance API 獲取持倉
 */
@Injectable()
export class BinancePositionProvider implements ExchangePositionProvider {
  getExchangeName(): string {
    return 'BINANCE';
  }

  async getPositions(userId: string): Promise<ExchangePosition[]> {
    console.log(`[BinancePositionProvider] Fetching positions for user: ${userId}`);

    // TODO: 這裡應該呼叫真實的 Binance API
    // 例如使用 ccxt 或官方 SDK：
    // const positions = await this.binanceClient.futuresPositionRisk();

    // 目前返回 mock 數據
    return [
      {
        symbol: 'BTCUSDT',
        quantity: 0.5,
        side: 'BUY',
        entryPrice: 64500,
        unrealizedPnl: 250,
      },
      {
        symbol: 'ETHUSDT',
        quantity: 3.2,
        side: 'BUY',
        entryPrice: 3100,
        unrealizedPnl: -45,
      },
    ];
  }
}
