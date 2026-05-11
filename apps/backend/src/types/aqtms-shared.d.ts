declare module '@aqtms/shared-types' {
  export interface CancelTradeDto {
    orderId: string;
    exchangeAccountId: string;
    exchangeOrderId: string;
    symbol: string;
  }

  export interface CreateTradeDto {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
    quantity: number;
    price?: number;
    exchangeAccountId?: string;
    idempotencyKey?: string;
    stopPrice?: number;
    timeInForce: 'GTC' | 'IOC' | 'FOK';
    isPaper?: boolean;
  }

  export const CreateTradeDtoSchema: any;
  export const CancelTradeDtoSchema: any;
  export const TradeResponseDtoSchema: any;
}
