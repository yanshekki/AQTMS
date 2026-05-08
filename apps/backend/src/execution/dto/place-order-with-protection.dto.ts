import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PlaceOrderWithProtectionDto {
  @IsString()
  userId: string;

  @IsEnum(['BINANCE', 'BYBIT'])
  exchange: 'BINANCE' | 'BYBIT';

  @IsString()
  symbol: string;

  @IsEnum(['BUY', 'SELL'])
  side: 'BUY' | 'SELL';

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsNumber()
  price?: number; // 限價單價格，市價單可不填

  @IsOptional()
  @IsNumber()
  stopLoss?: number; // 止損價格

  @IsOptional()
  @IsNumber()
  takeProfit?: number; // 止盈價格

  @IsOptional()
  @IsString()
  orderType?: 'MARKET' | 'LIMIT' = 'MARKET';
}
