import { BaseEntity } from './base.entity';
import { Money } from '../value-objects/money.vo';

export interface PositionProps {
  id: string;
  userId: string;
  exchangeAccountId: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Position extends BaseEntity {
  private readonly _userId: string;
  private readonly _exchangeAccountId: string;
  private readonly _symbol: string;
  private _quantity: number;
  private _avgPrice: number;
  private _unrealizedPnl: number;
  private _realizedPnl: number;

  constructor(props: PositionProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._userId = props.userId;
    this._exchangeAccountId = props.exchangeAccountId;
    this._symbol = props.symbol;
    this._quantity = props.quantity;
    this._avgPrice = props.avgPrice;
    this._unrealizedPnl = props.unrealizedPnl;
    this._realizedPnl = props.realizedPnl;
  }

  get userId(): string { return this._userId; }
  get exchangeAccountId(): string { return this._exchangeAccountId; }
  get symbol(): string { return this._symbol; }
  get quantity(): number { return this._quantity; }
  get avgPrice(): number { return this._avgPrice; }
  get unrealizedPnl(): number { return this._unrealizedPnl; }
  get realizedPnl(): number { return this._realizedPnl; }

  updateOnFill(side: 'BUY' | 'SELL', fillQty: number, fillPrice: number): void {
    if (side === 'BUY') {
      const totalCost = this._quantity * this._avgPrice + fillQty * fillPrice;
      this._quantity += fillQty;
      this._avgPrice = totalCost / this._quantity;
    } else {
      const realized = (fillPrice - this._avgPrice) * Math.min(fillQty, this._quantity);
      this._realizedPnl += realized;
      this._quantity = Math.max(0, this._quantity - fillQty);
    }
    this.touch();
  }

  static create(props: Omit<PositionProps, 'id' | 'createdAt' | 'updatedAt' | 'unrealizedPnl' | 'realizedPnl'>): Position {
    return new Position({
      ...props,
      id: '',
      unrealizedPnl: 0,
      realizedPnl: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
