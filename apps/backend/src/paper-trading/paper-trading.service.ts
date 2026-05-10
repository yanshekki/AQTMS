import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService, MarketPrice } from '../market-data/market-data.service';
import { RiskService } from '../risk/risk.service';

export interface PaperPosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
  unrealizedPnl: number;
}

export interface PaperOrderResult {
  success: boolean;
  orderId?: string;
  message: string;
  filled?: boolean;
}

@Injectable()
export class PaperTradingService {
  private readonly logger = new Logger(PaperTradingService.name);
  private virtualBalances: Map<string, number> = new Map(); // userId -> balance
  private positions: Map<string, Map<string, PaperPosition>> = new Map(); // userId -> symbol -> position
  private orders: Map<string, any> = new Map();

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly riskService: RiskService,
  ) {
    this.logger.log('PaperTradingService initialized (simulation mode)');
  }

  async initializeUser(userId: string, initialBalance = 10000): Promise<void> {
    if (!this.virtualBalances.has(userId)) {
      this.virtualBalances.set(userId, initialBalance);
      this.positions.set(userId, new Map());
      this.logger.log(`Initialized paper trading for user ${userId} with balance ${initialBalance}`);
    }
  }

  async getBalance(userId: string): Promise<number> {
    await this.initializeUser(userId);
    return this.virtualBalances.get(userId)!;
  }

  async getPositions(userId: string): Promise<PaperPosition[]> {
    await this.initializeUser(userId);
    return Array.from(this.positions.get(userId)!.values());
  }

  async placePaperOrder(params: {
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
  }): Promise<PaperOrderResult> {
    await this.initializeUser(params.userId);

    const balance = this.virtualBalances.get(params.userId)!;
    const currentPrice = (await this.marketDataService.getPrice(params.symbol))?.price || params.price || 0;

    if (currentPrice === 0) {
      return { success: false, message: 'No market price available for symbol' };
    }

    // Risk check
    const riskResult = this.riskService.evaluateTradeRisk({
      symbol: params.symbol,
      quantity: params.quantity,
      price: currentPrice,
      accountBalance: balance,
      currentPositions: Array.from(this.positions.get(params.userId)!.values()),
      dailyPnL: 0,
    });

    if (!riskResult.allowed) {
      return {
        success: false,
        message: `Risk check failed: ${riskResult.violations.join(', ')}`,
        filled: false,
      };
    }

    const orderId = `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const order = {
      id: orderId,
      ...params,
      status: 'FILLED',
      filledAt: new Date(),
      fillPrice: currentPrice,
    };
    this.orders.set(orderId, order);

    // Simulate fill immediately for market orders
    this.applyFill(params.userId, params.symbol, params.side, params.quantity, currentPrice);

    this.logger.log(`Paper order ${orderId} executed for ${params.userId}: ${params.side} ${params.quantity} ${params.symbol} @ ${currentPrice}`);

    return {
      success: true,
      orderId,
      message: 'Paper order filled successfully (simulated)',
      filled: true,
    };
  }

  private applyFill(userId: string, symbol: string, side: string, quantity: number, price: number): void {
    const userPositions = this.positions.get(userId)!;
    const currentPos = userPositions.get(symbol) || { symbol, quantity: 0, avgPrice: 0, unrealizedPnl: 0 };
    const balance = this.virtualBalances.get(userId)!;

    const cost = quantity * price;

    if (side === 'BUY') {
      const newQty = currentPos.quantity + quantity;
      const newAvg = currentPos.quantity > 0 
        ? (currentPos.avgPrice * currentPos.quantity + cost) / newQty 
        : price;
      currentPos.quantity = newQty;
      currentPos.avgPrice = newAvg;
      this.virtualBalances.set(userId, balance - cost);
    } else {
      // SELL
      if (currentPos.quantity >= quantity) {
        const pnl = (price - currentPos.avgPrice) * quantity;
        currentPos.quantity -= quantity;
        this.virtualBalances.set(userId, balance + cost + pnl);
        if (currentPos.quantity === 0) {
          userPositions.delete(symbol);
          return;
        }
      } else {
        // Short or partial, simplified
        this.virtualBalances.set(userId, balance + cost);
      }
    }

    currentPos.unrealizedPnl = (price - currentPos.avgPrice) * currentPos.quantity;
    userPositions.set(symbol, currentPos);
  }

  async updatePositionsWithMarketData(): Promise<void> {
    // Could be called periodically or via market data subscription
    for (const [userId, posMap] of this.positions.entries()) {
      for (const [symbol, pos] of posMap.entries()) {
        const price = (await this.marketDataService.getPrice(symbol))?.price;
        if (price) {
          pos.unrealizedPnl = (price - pos.avgPrice) * pos.quantity;
        }
      }
    }
  }
}