import { Injectable, Inject, Optional } from '@nestjs/common';
import { IExecutionLogRepository } from './interfaces/execution-log.repository';
import { ExecutionLog, LogQuery } from './execution-logger.service';
import { ExecutionStatsDto } from './dto/execution-stats.dto';

@Injectable()
export class ExecutionLoggerService {
  constructor(
    @Optional() @Inject('EXECUTION_LOG_REPOSITORY')
    private readonly logRepository?: IExecutionLogRepository,
  ) {}

  // ... existing methods ...

  getStats(): ExecutionStatsDto {
    const logs = this.logRepository ? this.logRepository.find({}) as ExecutionLog[] : [];
    const total = logs.length;
    const errors = logs.filter(l => l.level === 'error').length;
    const retries = logs.filter(l => l.action === 'RETRY').length;

    const latencies = logs
      .filter(l => l.latencyMs !== undefined)
      .map(l => l.latencyMs!);

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    return {
      totalLogs: total,
      errorCount: errors,
      retryCount: retries,
      errorRate: total > 0 ? parseFloat(((errors / total) * 100).toFixed(2)) : 0,
      averageLatencyMs: Math.round(avgLatency),
      lastUpdated: new Date(),
    };
  }

  // ... other methods ...
}
