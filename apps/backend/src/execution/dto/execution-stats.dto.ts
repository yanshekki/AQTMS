export class ExecutionStatsDto {
  totalLogs: number;
  errorCount: number;
  retryCount: number;
  errorRate: number;           // 百分比
  averageLatencyMs: number;
  lastUpdated: Date;
}

export class RecentExecutionDto {
  timestamp: Date;
  action: string;
  level: string;
  symbol?: string;
  side?: string;
  orderId?: string;
  latencyMs?: number;
  error?: string;
}

export class ActiveOrderSummaryDto {
  totalActive: number;
  bySymbol: Record<string, number>;
  bySide: { buy: number; sell: number };
}

export class ErrorSummaryDto {
  totalErrors: number;
  byAction: Record<string, number>;
  recentErrors: RecentExecutionDto[];
}

export class MonitoringSnapshotDto {
  stats: ExecutionStatsDto;
  recentExecutions: RecentExecutionDto[];
  activeOrders?: ActiveOrderSummaryDto;
  errorSummary: ErrorSummaryDto;
  timestamp: Date;
}
