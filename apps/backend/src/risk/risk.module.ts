import { Module } from '@nestjs/common';
import { RiskService } from './risk.service';

@Module({
  providers: [RiskService],
  exports: [RiskService], // 讓其他 module 可以注入使用
})
export class RiskModule {}
