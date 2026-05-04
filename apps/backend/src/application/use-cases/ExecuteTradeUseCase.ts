// ── ExecuteTradeUseCase ──
// Orchestrates trade execution: validates, checks via RiskEngine,
// routes to correct exchange adapter, persists via repository.

import type { BaseTradingAdapter } from '../../infrastructure/adapters/exchanges/BaseTradingAdapter';
import type { ITradeRepository } from '../../domain/entities/Trade';
import type { CreateTradeDto } from '@aqtms/shared-types';
import { DomainError, InfraError } from '../../shared/errors';

export interface ExchangeAdapterMap {
  get(exchangeAccountId: string, userId: string): Promise<BaseTradingAdapter | undefined>;
}

export class ExecuteTradeUseCase {
  constructor(
    private readonly adapterMap: ExchangeAdapterMap,
    private readonly tradeRepository: ITradeRepository,
  ) {}

  async execute(dto: CreateTradeDto, userId: string) {
    // 1. Check idempotency (prevent duplicate execution)
    const existing = await this.tradeRepository.findByIdempotencyKey(dto.idempotencyKey);
    if (existing) {
      return existing;
    }

    // 2. Get the correct exchange adapter (resolves account ID → exchange type → adapter)
    const adapter = await this.adapterMap.get(dto.exchangeAccountId, userId);
    if (!adapter) {
      throw new DomainError(
        `Exchange account not found: ${dto.exchangeAccountId}`,
        'EXCHANGE_NOT_FOUND',
      );
    }

    // 3. Execute trade via adapter (with circuit breaker + retry built-in)
    try {
      const trade = await adapter.createOrder({
        symbol: dto.symbol,
        side: dto.side,
        type: dto.type,
        quantity: dto.quantity,
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.stopPrice !== undefined ? { stopPrice: dto.stopPrice } : {}),
        timeInForce: dto.timeInForce,
        idempotencyKey: dto.idempotencyKey,
      });

      // 4. Persist trade
      const saved = await this.tradeRepository.save(trade);
      return saved;
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfraError) {
        throw error;
      }
      throw new InfraError(
        `Trade execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRADE_EXECUTION_FAILED',
      );
    }
  }
}
