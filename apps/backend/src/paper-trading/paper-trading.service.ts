import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { BinanceWebsocketClient } from '../websocket/clients/binance-websocket.client';

export interface VirtualPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  unrealizedPnl: number;
}

@Injectable()
export class PaperTradingService {
  private readonly logger = new Logger(PaperTradingService.name);

  private readonly DEFAULT_PAPER_BALANCE = 10000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
    @Inject(forwardRef(() => BinanceWebsocketClient))
    private readonly binanceWebsocketClient: BinanceWebsocketClient,
  ) {
    this.logger.log('PaperTradingService initialized with auto price subscription');
  }

  async getVirtualBalance(exchangeAccountId: string): Promise<number> {
    const account = await this.prisma.exchangeAccount.findUnique({
      where: { id: exchangeAccountId },
      select: { paperVirtualBalance: true },
    });
    return account?.paperVirtualBalance ?? this.DEFAULT_PAPER_BALANCE;
  }

  private async updateVirtualBalance(exchangeAccountId: string, newBalance: number) {
    await this.prisma.exchangeAccount.update({
      where: { id: exchangeAccountId },
      data: { paperVirtualBalance: newBalance },
    });
  }

  async placePaperOrder(orderData: {
    userId: string;
    exchangeAccountId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    fillImmediately?: boolean;
  }) {
    const { userId, exchangeAccountId, symbol, side, quantity, price, fillImmediately = true } = orderData;

    const currentBalance = await this.getVirtualBalance(exchangeAccountId);

    const slippagePercent = (Math.random() * 10 + 5) / 10000;
    const slippage = slippagePercent * (side === 'BUY' ? 1 : -1);
    const executedPrice = price * (1 + slippage);

    const notional = quantity * executedPrice;
    const fee = notional * 0.001;

    const costWithFee = side === 'BUY' ? notional + fee : notional - fee;

    if (side === 'BUY' && currentBalance < costWithFee) {
      throw new Error(`虛擬餘額不足`);
    }

    const newBalance = side === 'BUY' ? currentBalance - costWithFee : currentBalance + costWithFee;
    await this.updateVirtualBalance(exchangeAccountId, newBalance);

    const orderId = 'paper-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    await this.prisma.trade.create({
      data: {
        id: orderId,
        userId,
        exchangeAccountId,
        symbol,
        side,
        type: 'MARKET',
        status: fillImmediately ? 'FILLED' : 'PENDING',
        quantity,
        price: executedPrice,
        filledQuantity: fillImmediately ? quantity : 0,
        isPaper: true,
        idempotencyKey: orderId,
      },
    });

    // === 自動訂閱該 symbol 嘅實時價格 ===
    try {
      this.binanceWebsocketClient.subscribeToMiniTicker([symbol]);
    } catch (e) {
      this.logger.warn('Failed to auto-subscribe price stream');
    }

    this.logger.log(`[Paper] ${side} ${quantity} ${symbol} | Balance updated`);

    return { success: true, orderId, isPaper: true, executedPrice };
  }

  // ... other methods remain ...
}
