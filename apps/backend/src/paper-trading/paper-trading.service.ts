import { Injectable, Logger } from '@nestjs/common';

export interface PaperOrder {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;           // 委託價格
  executedPrice: number;   // 實際成交價格（含滑點）
  fee: number;             // 手續費
  status: 'FILLED' | 'OPEN' | 'CANCELLED';
  createdAt: Date;
}

export interface VirtualPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  unrealizedPnl: number;
}

@Injectable()
export class PaperTradingService {
  private readonly logger = new Logger(PaperTradingService.name);

  // 記憶體儲存（MVP）
  private virtualBalances = new Map<string, number>(); // userId -> USDT balance
  private virtualPositions = new Map<string, Map<string, VirtualPosition>>();
  private paperOrders: PaperOrder[] = [];

  private readonly DEFAULT_BALANCE = 10000; // 預設虛擬 USDT 餘額

  // 可配置參數
  private readonly SLIPPAGE_BPS = 10; // 基點（10 = 0.10%）
  private readonly TAKER_FEE_RATE = 0.001; // 0.1% Taker fee

  constructor() {
    this.logger.log('PaperTradingService initialized (with slippage + fee simulation)');
  }

  /**
   * 獲取用戶虛擬餘額
   */
  getVirtualBalance(userId: string): number {
    return this.virtualBalances.get(userId) ?? this.DEFAULT_BALANCE;
  }

  /**
   * 模擬下單（含滑點 + 手續費 + 餘額更新）
   */
  async placePaperOrder(orderData: {
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
  }): Promise<PaperOrder> {
    const { userId, symbol, side, quantity, price } = orderData;

    // 1. 滑點模擬（基點轉百分比）
    const slippagePercent = (Math.random() * this.SLIPPAGE_BPS + this.SLIPPAGE_BPS / 2) / 10000;
    const slippage = slippagePercent * (side === 'BUY' ? 1 : -1);
    const executedPrice = price * (1 + slippage);

    // 2. 計算手續費（Taker）
    const notional = quantity * executedPrice;
    const fee = notional * this.TAKER_FEE_RATE;

    // 3. 檢查餘額（買入時需包含手續費）
    let currentBalance = this.getVirtualBalance(userId);
    const costWithFee = side === 'BUY' ? notional + fee : notional - fee;

    if (side === 'BUY' && currentBalance < costWithFee) {
      throw new Error(`虛擬餘額不足（需要 ${costWithFee.toFixed(2)} USDT）`);
    }

    // 4. 更新餘額
    if (side === 'BUY') {
      currentBalance -= costWithFee;
    } else {
      currentBalance += costWithFee;
    }
    this.virtualBalances.set(userId, currentBalance);

    // 5. 建立訂單
    const order: PaperOrder = {
      id: 'paper-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      userId,
      symbol,
      side,
      quantity,
      price,
      executedPrice,
      fee,
      status: 'FILLED',
      createdAt: new Date(),
    };

    this.paperOrders.push(order);

    // 6. 更新持倉
    this.updateVirtualPosition(order);

    this.logger.log(
      `[Paper] ${side} ${quantity} ${symbol} @ ${executedPrice.toFixed(2)} ` +
      `(slippage: ${(slippage * 100).toFixed(3)}%, fee: ${fee.toFixed(2)})`,
    );

    return order;
  }

  /**
   * 更新虛擬持倉
   */
  private updateVirtualPosition(order: PaperOrder) {
    const userPositions = this.virtualPositions.get(order.userId) || new Map();
    const existing = userPositions.get(order.symbol);

    const executedQty = order.side === 'BUY' ? order.quantity : -order.quantity;

    if (!existing) {
      userPositions.set(order.symbol, {
        symbol: order.symbol,
        quantity: executedQty,
        averagePrice: order.executedPrice,
        unrealizedPnl: 0,
      });
    } else {
      const totalCost = existing.averagePrice * existing.quantity + order.executedPrice * executedQty;
      const newQuantity = existing.quantity + executedQty;

      if (newQuantity === 0) {
        userPositions.delete(order.symbol);
      } else {
        existing.quantity = newQuantity;
        existing.averagePrice = totalCost / newQuantity;
      }
    }

    this.virtualPositions.set(order.userId, userPositions);
  }

  getVirtualPositions(userId: string): VirtualPosition[] {
    const positions = this.virtualPositions.get(userId);
    return positions ? Array.from(positions.values()) : [];
  }

  getPaperOrders(userId: string): PaperOrder[] {
    return this.paperOrders.filter((o) => o.userId === userId);
  }
}
