import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LOSS = 'STOP_LOSS',
  TAKE_PROFIT = 'TAKE_PROFIT',
}

export class CreateOrderDto {
  @IsString()
  symbol: string;

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsEnum(OrderType)
  type: OrderType;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  stopLoss?: number;

  @IsOptional()
  @IsNumber()
  takeProfit?: number;
}
