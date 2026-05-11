import { Module } from '@nestjs/common';
import { CcxtPositionProvider } from './providers/ccxt-position.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionService } from '../infrastructure/shared/encryption.service';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'EXCHANGE_POSITION_PROVIDER',
      useClass: CcxtPositionProvider,
    },
    CcxtPositionProvider,
    EncryptionService,
    CcxtExchangeAdapter,
  ],
  exports: ['EXCHANGE_POSITION_PROVIDER', CcxtPositionProvider],
})
export class ExchangeModule {}
