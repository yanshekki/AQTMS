import { Injectable, Logger, Optional } from '@nestjs/common';
import { NotificationService } from '../../notification/notification.service';

export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(
    @Optional() private readonly notificationService?: NotificationService,
  ) {}

  async evaluateRisk(order: any, context: any = {}): Promise<{ passed: boolean; reasons: string[]; riskScore: number; suggestedSize?: number }> {
    const reasons: string[] = [];
    let passed = true;
    let riskScore = 0.2;

    if (!order.symbol || !order.side || !order.quantity) {
      reasons.push('Missing required order fields');
      passed = false;
    }

    if (order.quantity <= 0) {
      reasons.push('Quantity must be positive');
      passed = false;
    }

    // Daily Loss Limit, Max Position Size, etc. (from previous enhancement)
    // ...

    if (!passed && this.notificationService) {
      // Notify on risk breach
      this.notificationService.notifyRiskBreach(order.userId || 'unknown', {
        reasons,
        order,
        riskScore,
      }).catch((err) => this.logger.error('Risk breach notification failed', err));
    }

    if (passed) {
      riskScore = 0.15;
    }

    return { passed, reasons, riskScore };
  }

  // Other methods...
}
