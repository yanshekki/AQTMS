import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BinancePositionProvider } from './providers/binance-position.provider';
import { BybitPositionProvider } from './providers/bybit-position.provider';
import { ExchangePositionProvider } from './interfaces/exchange-position.provider';
import { BinanceAdapter } from './adapters/binance.adapter';

@Module({
  imports: [ConfigModule],
  providers: [
    BinancePositionProvider,
    BybitPositionProvider,
    BinanceAdapter,
    {
      provide: 'EXCHANGE_POSITION_PROVIDER',
      useFactory: (
        configService: ConfigService,
        binanceProvider: BinancePositionProvider,
        bybitProvider: BybitPositionProvider,
      ) => {
        const providerType = configService.get<string>('EXCHANGE_PROVIDER', 'BINANCE');

        if (providerType.toUpperCase() === 'BYBIT') {
          return bybitProvider;
        }
        return binanceProvider;
      },
      inject: [ConfigService, BinancePositionProvider, BybitPositionProvider],
    },
  ],
  exports: ['EXCHANGE_POSITION_PROVIDER', BinanceAdapter],
})
export class ExchangeModule {}
