import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RiskModule } from './risk/risk.module';
import { MarketDataModule } from './market-data/market-data.module';
import { ExecutionModule } from './execution/execution.module';
import { PaperTradingModule } from './paper-trading/paper-trading.module';
import { WebsocketModule } from './websocket/websocket.module';
import { OrderModule } from './orders/order.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { SafetyModule } from './safety/safety.module';
import { PortfolioSnapshotProcessor } from './queues/processors/portfolio-snapshot.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'portfolio-snapshots',
    }),
    PrismaModule,
    AuthModule,
    RiskModule,
    MarketDataModule,
    PaperTradingModule,
    ExecutionModule,
    WebsocketModule,
    OrderModule,
    PortfolioModule,
    SafetyModule,
  ],
  controllers: [AppController],
  providers: [AppService, PortfolioSnapshotProcessor],
})
export class AppModule {}