import { Injectable, Inject, Optional } from '@nestjs/common';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { ExchangeAccountRepository } from '../infrastructure/persistence/ExchangeAccountRepository';
import { ExchangePositionProvider } from '../exchange/interfaces/exchange-position.provider';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly paperTradingService: PaperTradingService,
    private readonly exchangeAccountRepo: ExchangeAccountRepository,
    @Optional() @Inject('EXCHANGE_POSITION_PROVIDER')
    private readonly positionProvider?: ExchangePositionProvider,
  ) {}

  async getPortfolioSummary(userId: string) {
    const positions = await this.getPositions(userId);

    const totalValue = positions.reduce((sum, p) => sum + Math.abs(p.quantity) * p.currentPrice, 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const riskExposure = totalValue > 0 ? Math.min((totalValue / 50000) * 100, 100) : 0;

    return {
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalUnrealizedPnl: parseFloat(totalUnrealizedPnl.toFixed(2)),
      totalRiskExposure: parseFloat(riskExposure.toFixed(1)),
      positionCount: positions.length,
      lastUpdated: new Date(),
    };
  }

  async getPositions(userId: string) {
    const allPositions: any[] = [];

    const accounts = await this.exchangeAccountRepo.findByUser(userId);

    for (const account of accounts) {
      if (account.isPaperTrading) {
        // Paper Trading
        const paperPositions = this.paperTradingService.getVirtualPositions(userId);
        for (const p of paperPositions) {
          allPositions.push({
            symbol: p.symbol,
            exchange: `${account.exchange} (Paper)`,
            side: p.quantity > 0 ? 'BUY' : 'SELL',
            quantity: Math.abs(p.quantity),
            averagePrice: p.averagePrice,
            currentPrice: p.averagePrice,
            unrealizedPnl: p.unrealizedPnl || 0,
            unrealizedPnlPercent: 0,
            isPaper: true,
          });
        }
      } else {
        // Live Trading - 使用 PositionProvider
        if (this.positionProvider) {
          try {
            const livePositions = await this.positionProvider.getPositions(userId);

            for (const p of livePositions) {
              allPositions.push({
                symbol: p.symbol,
                exchange: account.exchange,
                side: p.side,
                quantity: p.quantity,
                averagePrice: p.entryPrice || 0,
                currentPrice: p.entryPrice || 0, // TODO: 從行情服務獲取最新價
                unrealizedPnl: p.unrealizedPnl || 0,
                unrealizedPnlPercent: 0,
                isPaper: false,
              });
            }
          } catch (error) {
            console.error(`Failed to fetch live positions for ${account.exchange}`, error);
          }
        } else {
          // Fallback mock（如果沒有注入 provider）
          if (account.exchange === 'BINANCE') {
            allPositions.push({
              symbol: 'BTCUSDT',
              exchange: 'BINANCE',
              side: 'BUY',
              quantity: 0.12,
              averagePrice: 64800,
              currentPrice: 65250,
              unrealizedPnl: 54,
              unrealizedPnlPercent: 0.69,
              isPaper: false,
            });
          }
        }
      }
    }

    return allPositions;
  }
}
