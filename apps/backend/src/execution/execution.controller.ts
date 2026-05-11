import { Controller, Get, Query } from '@nestjs/common';
import { ExecutionLoggerService, LogQuery } from './execution-logger.service';
import { ExecutionMetricsCollector } from './metrics-collector.service';

@Controller('api/v1/execution')
export class ExecutionController {
  constructor(
    private readonly logger: ExecutionLoggerService,
    private readonly metricsCollector: ExecutionMetricsCollector,
  ) {}

  @Get('logs')
  getLogs(@Query() query: LogQuery) {
    return {
      success: true,
      data: (this.logger as any).getLogs(query),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  getStats() {
    return {
      success: true,
      data: this.logger.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  getMetrics() {
    return {
      success: true,
      data: this.metricsCollector.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  }
}
