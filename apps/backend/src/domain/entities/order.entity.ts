import { OrderStatus, OrderSide, OrderType } from '../value-objects/order-types';

export class Order {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly exchangeAccountId: string,
    public readonly symbol: string,
    public readonly side: OrderSide,
    public readonly type: OrderType,
    public readonly quantity: number,
    public readonly price?: number,
    public readonly stopLoss?: number,
    public readonly takeProfit?: number,
    public status: OrderStatus = OrderStatus.PENDING,
    public readonly isPaper: boolean = true,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public filledQuantity: number = 0,
    public avgFillPrice?: number,
  ) {}

  static create(params: {
    userId: string;
    exchangeAccountId: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    isPaper?: boolean;
  }): Order {
    return new Order(
      crypto.randomUUID(),
      params.userId,
      params.exchangeAccountId,
      params.symbol,
      params.side,
      params.type,
      params.quantity,
      params.price,
      params.stopLoss,
      params.takeProfit,
      OrderStatus.PENDING,
      params.isPaper ?? true,
    );
  }

  markAsFilled(filledQty: number, avgPrice: number): void {
    this.filledQuantity = filledQty;
    this.avgFillPrice = avgPrice;
    this.status = OrderStatus.FILLED;
    this.updatedAt = new Date();
  }

  markAsPartiallyFilled(filledQty: number, avgPrice: number): void {
    this.filledQuantity = filledQty;
    this.avgFillPrice = avgPrice;
    this.status = OrderStatus.PARTIALLY_FILLED;
    this.updatedAt = new Date();
  }

  cancel(): void {
    if (this.status === OrderStatus.PENDING || this.status === OrderStatus.PARTIALLY_FILLED) {
      this.status = OrderStatus.CANCELLED;
      this.updatedAt = new Date();
    }
  }

  isActive(): boolean {
    return this.status === OrderStatus.PENDING || this.status === OrderStatus.PARTIALLY_FILLED;
  }
}