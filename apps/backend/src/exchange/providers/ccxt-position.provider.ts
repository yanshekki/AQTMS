import { Injectable, Optional } from '@nestjs/common';
import { EncryptionService } from '../../infrastructure/shared/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CcxtExchangeAdapter } from '../../infrastructure/adapters/exchange/ccxt-exchange.adapter';
import { ExchangePositionProvider, ExchangePosition } from '../interfaces/exchange-position.provider';

@Injectable()
export class CcxtPositionProvider implements ExchangePositionProvider {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly encryptionService?: EncryptionService,
    @Optional() private readonly ccxtAdapter?: CcxtExchangeAdapter,
  ) {}

  async getPositions(userId: string, exchangeAccountId?: string): Promise<ExchangePosition[]> {
    // 1. Get the exchange account
    const where: any = { userId };
    if (exchangeAccountId) {
      where.id = exchangeAccountId;
    }

    const account = await this.prisma.exchangeAccount.findFirst({ where });

    if (!account || !account.apiKeyEncrypted) {
      return [];
    }

    if (!this.encryptionService || !this.ccxtAdapter) {
      console.warn('CcxtPositionProvider: Missing encryption or ccxt adapter');
      return [];
    }

    try {
      // Decrypt credentials
      const apiKey = this.encryptionService.decrypt(account.apiKeyEncrypted);
      const apiSecret = account.apiSecretEncrypted
        ? this.encryptionService.decrypt(account.apiSecretEncrypted)
        : undefined;

      // Initialize adapter
      await this.ccxtAdapter.initialize({
        exchange: account.exchange as any,
        apiKey,
        apiSecret,
        testnet: account.testnet || false,
      });

      // Fetch real positions from exchange
      const rawPositions = await this.ccxtAdapter.getPositions(account.id); // Using account.id as exchangeAccountId

      return rawPositions.map((pos: any) => ({
        symbol: pos.symbol,
        quantity: pos.contracts || pos.amount || 0,
        side: pos.side?.toUpperCase() === 'SHORT' ? 'SELL' : 'BUY',
        entryPrice: pos.entryPrice,
        unrealizedPnl: pos.unrealizedPnl,
      })) as ExchangePosition[];
    } catch (error) {
      console.error('CcxtPositionProvider failed to fetch positions:', error);
      return [];
    }
  }

  getExchangeName(): string {
    return 'CCXT';
  }
}
