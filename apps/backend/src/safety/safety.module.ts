import { Module } from '@nestjs/common';
import { KillSwitchService } from './kill-switch.service';

@Module({
  providers: [KillSwitchService],
  exports: [KillSwitchService],
})
export class SafetyModule {}
