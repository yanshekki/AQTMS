import { Module } from '@nestjs/common';
import { BinancePositionProvider } from './providers/binance-position.provider';

@Module({
  providers: [
    {
      provide: 'EXCHANGE_POSITION_PROVIDER',
      useClass: BinancePositionProvider,
    },
  ],
  exports: ['EXCHANGE_POSITION_PROVIDER'],
})
export class ExchangeModule {}
