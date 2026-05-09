import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly ordersPlaced = new promClient.Counter({
    name: 'aqtms_orders_placed_total',
    help: 'Total number of successfully placed orders',
    labelNames: ['exchange', 'symbol'],
  });

  private readonly ordersFailed = new promClient.Counter({
    name: 'aqtms_orders_failed_total',
    help: 'Total number of failed order placements',
    labelNames: ['exchange', 'symbol', 'reason'],
  });

  private readonly killSwitchTriggered = new promClient.Counter({
    name: 'aqtms_kill_switch_triggered_total',
    help: 'Total number of times kill switch was triggered',
    labelNames: ['reason'],
  });

  recordOrderPlaced(exchange: string, symbol: string) {
    this.ordersPlaced.inc({ exchange, symbol });
  }

  recordOrderFailed(exchange: string, symbol: string, reason: string) {
    this.ordersFailed.inc({ exchange, symbol, reason });
  }

  recordKillSwitchTriggered(reason: string) {
    this.killSwitchTriggered.inc({ reason });
  }
}
