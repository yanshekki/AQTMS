import { Injectable } from '@nestjs/common';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { ExchangeAccountRepository } from '../infrastructure/persistence/ExchangeAccountRepository';
// TODO: 之後注入真實的 Position Provider 或 ExecutionService

@Injectable()
export class PortfolioService {
  constructor(
    private readonly paperTradingService: PaperTradingService,
    private readonly exchangeAccountRepo: ExchangeAccountRepository,
    // TODO: private readonly binancePositionProvider: BinancePositionProvider,
    // TODO: private readonly bybitPositionProvider: BybitPositionProvider,
  ) {}

  async getPortfolioSummary(userId: string) {
    const positions = await this.getPositions(userId);

    const totalValue = positions.reduce((sum, p) => sum + Math.abs(p.quantity) * p.currentPrice, 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const riskExposure = totalValue > 0 ? Math.min((totalValue / 50000) * 100, 100) : 0;

    return {
      totalValue,
      totalUnrealizedPnl,
      totalRiskExposure: parseFloat(riskExposure.toFixed(1)),
      positionCount: positions.length,
      lastUpdated: new Date(),
    };
  }

  async getPositions(userId: string) {
    const allPositions = [];

    // 1. 獲取用戶所有交易所帳戶
    const accounts = await this.exchangeAccountRepo.findByUser(userId);

    for (const account of accounts) {
      if (account.isPaperTrading) {
        // Paper Trading 模式 → 使用模擬持倉
        const paperPositions = this.paperTradingService.getVirtualPositions(userId);
        for (const p of paperPositions) {
          allPositions.push({
            symbol: p.symbol,
            exchange: account.exchange + ' (Paper)',
            side: p.quantity > 0 ? 'BUY' : 'SELL',
            quantity: Math.abs(p.quantity),
            averagePrice: p.averagePrice,
            currentPrice: p.averagePrice, // TODO: 從行情服務獲取最新價
            unrealizedPnl: p.unrealizedPnl || 0,
            unrealizedPnlPercent: 0,
            isPaper: true,
          });
        }
      } else {
        // Live 模式 → TODO: 從真實交易所獲取持倉
        // const livePositions = await this.getLivePositionsFromExchange(account);
        // allPositions.push(...livePositions);

        // 暫時 mock 一個真實持倉（方便測試）
        if (account.exchange === 'BINANCE') {
          allPositions.push({
            symbol: 'BTCUSDT',
            exchange: 'BINANCE',
            side: 'BUY',
            quantity: 0.15,
            averagePrice: 64500,
            currentPrice: 65200,
            unrealizedPnl: 105,
            unrealizedPnlPercent: 1.09,
            isPaper: false,
          });
        }
      }
    }

    return allPositions;
  }

  // TODO: 實作真實從交易所獲取持倉的方法
  // private async getLivePositionsFromExchange(account: any) { ... }
}
