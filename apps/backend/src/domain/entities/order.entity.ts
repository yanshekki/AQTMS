import { BaseEntity } from './base.entity';
import { Money } from '../value-objects/money.vo';
import { OrderStatus } from '../value-objects/order-status.vo';

export interface OrderProps {
  id: string;
  userId: string;
  exchangeAccountId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: OrderStatus;
  isPaper: boolean;
  filledQuantity: number;
  avgFillPrice?: number;
  exchangeOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Order extends BaseEntity {
  private readonly _userId: string;
  private readonly _exchangeAccountId: string;
  private readonly _symbol: string;
  private readonly _side: 'BUY' | 'SELL';
  private readonly _type: string;
  private readonly _quantity: number;
  private _price?: number;
  private _stopLoss?: number;
  private _takeProfit?: number;
  private _status: OrderStatus;
  private readonly _isPaper: boolean;
  private _filledQuantity: number;
  private _avgFillPrice?: number;
  private _exchangeOrderId?: string;

  constructor(props: OrderProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._userId = props.userId;
    this._exchangeAccountId = props.exchangeAccountId;
    this._symbol = props.symbol;
    this._side = props.side;
    this._type = props.type;
    this._quantity = props.quantity;
    this._price = props.price;
    this._stopLoss = props.stopLoss;
    this._takeProfit = props.takeProfit;
    this._status = props.status;
    this._isPaper = props.isPaper;
    this._filledQuantity = props.filledQuantity;
    this._avgFillPrice = props.avgFillPrice;
    this._exchangeOrderId = props.exchangeOrderId;
  }

  // Getters
  get userId(): string { return this._userId; }
  get exchangeAccountId(): string { return this._exchangeAccountId; }
  get symbol(): string { return this._symbol; }
  get side(): 'BUY' | 'SELL' { return this._side; }
  get type(): string { return this._type; }
  get quantity(): number { return this._quantity; }
  get price(): number | undefined { return this._price; }
  get stopLoss(): number | undefined { return this._stopLoss; }
  get takeProfit(): number | undefined { return this._takeProfit; }
  get status(): OrderStatus { return this._status; }
  get isPaper(): boolean { return this._isPaper; }
  get filledQuantity(): number { return this._filledQuantity; }
  get avgFillPrice(): number | undefined { return this._avgFillPrice; }
  get exchangeOrderId(): string | undefined { return this._exchangeOrderId; }

  // Business methods
  applyPartialFill(filledQty: number, avgPrice: number): void {
    if (filledQty <= 0 || filledQty > this._quantity - this._filledQuantity) {
      throw new Error('Invalid partial fill quantity');
    }
    this._filledQuantity += filledQty;
    this._avgFillPrice = avgPrice; // simplified, in real would weighted avg
    if (this._filledQuantity >= this._quantity) {
      this._status = OrderStatus.FILLED;
    } else {
      this._status = OrderStatus.PARTIALLY_FILLED;
    }
    this.touch();
  }

  cancel(): void {
    if (this._status === OrderStatus.FILLED || this._status === OrderStatus.CANCELLED) {
      throw new Error('Cannot cancel filled or already cancelled order');
    }
    this._status = OrderStatus.CANCELLED;
    this.touch();
  }

  // Factory
  static create(props: Omit<OrderProps, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'filledQuantity'>): Order {
    return new Order({
      ...props,
      id: '', // will be set by repo
      status: OrderStatus.PENDING,
      filledQuantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
