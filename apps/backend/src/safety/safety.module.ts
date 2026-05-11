import { Module } from '@nestjs/common';
import { KillSwitchService } from './kill-switch.service';
import { MetricsService } from '../common/metrics/metrics.service';

@Module({
  providers: [KillSwitchService, MetricsService],
  exports: [KillSwitchService],
})
export class SafetyModule {}
