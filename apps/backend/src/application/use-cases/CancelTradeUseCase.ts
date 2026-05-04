// ── CancelTradeUseCase ──

import type { BaseTradingAdapter } from '../../infrastructure/adapters/exchanges/BaseTradingAdapter';
import type { ITradeRepository } from '../../domain/entities/Trade';
import type { CancelTradeDto } from '@aqtms/shared-types';
import { DomainError, InfraError } from '../../shared/errors';

export interface ExchangeAdapterMap {
  get(exchangeAccountId: string, userId: string): Promise<BaseTradingAdapter | undefined>;
}

export class CancelTradeUseCase {
  constructor(
    private readonly adapterMap: ExchangeAdapterMap,
    private readonly tradeRepository: ITradeRepository,
  ) {}

  async execute(dto: CancelTradeDto, userId: string) {
    const adapter = await this.adapterMap.get(dto.exchangeAccountId, userId);
    if (!adapter) {
      throw new DomainError(
        `Exchange account not found: ${dto.exchangeAccountId}`,
        'EXCHANGE_NOT_FOUND',
      );
    }

    try {
      const trade = await adapter.cancelOrder({
        symbol: dto.symbol,
        exchangeOrderId: dto.exchangeOrderId,
      });

      await this.tradeRepository.updateStatus(trade.id, 'CANCELLED');
      return trade;
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfraError) {
        throw error;
      }
      throw new InfraError(
        `Trade cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRADE_CANCEL_FAILED',
      );
    }
  }
}
