import { Injectable } from '@nestjs/common';
import { MetricsService } from '../common/metrics/metrics.service';

@Injectable()
export class KillSwitchService {
  constructor(private readonly metricsService: MetricsService) {}

  triggerKillSwitch(reason: string) {
    this.metricsService.recordKillSwitchTriggered(reason);
    // ... existing logic ...
  }

  // ... other methods ...
}
