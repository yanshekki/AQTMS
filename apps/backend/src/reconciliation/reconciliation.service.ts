import { Injectable, Inject, Optional } from '@nestjs/common';
import { ExchangePositionProvider } from '../exchange/interfaces/exchange-position.provider';

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
  constructor(
    @Optional() @Inject('EXCHANGE_POSITION_PROVIDER')
    private readonly positionProvider?: ExchangePositionProvider,
  ) {}

  async reconcilePositions(userId: string): Promise<ReconciliationResult> {
    console.log(`[Reconciliation] Starting reconciliation for user: ${userId}`);

    const systemPositions = this.getSystemPositions(userId);

    let exchangePositions: any[] = [];
    if (this.positionProvider) {
      exchangePositions = await this.positionProvider.getPositions(userId);
    } else {
      // Fallback to mock if no provider is injected
      exchangePositions = this.getMockExchangePositions();
    }

    const differences = this.comparePositions(systemPositions, exchangePositions);

    const result: ReconciliationResult = {
      userId,
      timestamp: new Date(),
      totalPositions: exchangePositions.length,
      differences,
      hasDiscrepancy: differences.length > 0,
    };

    if (result.hasDiscrepancy) {
      console.warn(`[Reconciliation] Found discrepancies for user ${userId}`);
    }

    return result;
  }

  private getSystemPositions(userId: string) {
    // TODO: 從真實系統獲取
    return [
      { symbol: 'BTCUSDT', quantity: 0.5, side: 'BUY' },
      { symbol: 'ETHUSDT', quantity: 2.0, side: 'BUY' },
    ];
  }

  private getMockExchangePositions() {
    return [
      { symbol: 'BTCUSDT', quantity: 0.5, side: 'BUY' },
      { symbol: 'ETHUSDT', quantity: 1.8, side: 'BUY' },
    ];
  }

  private comparePositions(systemPositions: any[], exchangePositions: any[]): PositionDifference[] {
    const differences: PositionDifference[] = [];

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
}
