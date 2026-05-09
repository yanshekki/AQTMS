import { Injectable } from '@nestjs/common';

export interface ExecutionMetrics {
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  totalRetries: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
  errorRate: number;
  lastUpdated: Date;
}

@Injectable()
export class ExecutionMetricsCollector {
  private metrics = {
    totalOrders: 0,
    successfulOrders: 0,
    failedOrders: 0,
    totalRetries: 0,
    totalLatencyMs: 0,
  };

  recordOrder(success: boolean, latencyMs?: number) {
    this.metrics.totalOrders++;

    if (success) {
      this.metrics.successfulOrders++;
    } else {
      this.metrics.failedOrders++;
    }

    if (latencyMs) {
      this.metrics.totalLatencyMs += latencyMs;
    }
  }

  recordRetry() {
    this.metrics.totalRetries++;
  }

  getMetrics(): ExecutionMetrics {
    const total = this.metrics.totalOrders;
    const avgLatency = total > 0 ? this.metrics.totalLatencyMs / total : 0;

    return {
      totalOrders: this.metrics.totalOrders,
      successfulOrders: this.metrics.successfulOrders,
      failedOrders: this.metrics.failedOrders,
      totalRetries: this.metrics.totalRetries,
      totalLatencyMs: this.metrics.totalLatencyMs,
      averageLatencyMs: Math.round(avgLatency),
      errorRate: total > 0 ? parseFloat(((this.metrics.failedOrders / total) * 100).toFixed(2)) : 0,
      lastUpdated: new Date(),
    };
  }

  reset() {
    this.metrics = {
      totalOrders: 0,
      successfulOrders: 0,
      failedOrders: 0,
      totalRetries: 0,
      totalLatencyMs: 0,
    };
  }
}
