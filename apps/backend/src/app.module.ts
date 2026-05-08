import { Module } from '@nestjs/common';
import { RiskModule } from './risk/risk.module';
import { ExecutionModule } from './execution/execution.module';

@Module({
  imports: [
    RiskModule,
    ExecutionModule,
    // 其他 module...
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
