export class Position {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly exchangeAccountId: string,
    public readonly symbol: string,
    public quantity: number,
    public avgPrice: number,
    public unrealizedPnl: number = 0,
    public realizedPnl: number = 0,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  updatePrice(currentPrice: number): void {
    this.unrealizedPnl = (currentPrice - this.avgPrice) * this.quantity;
  }

  static create(params: {
    userId: string;
    exchangeAccountId: string;
    symbol: string;
    quantity: number;
    avgPrice: number;
  }): Position {
    return new Position(
      '', // id will be set by DB
      params.userId,
      params.exchangeAccountId,
      params.symbol,
      params.quantity,
      params.avgPrice,
    );
  }
}