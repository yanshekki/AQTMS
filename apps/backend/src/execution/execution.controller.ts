import { Controller, Get, Query } from '@nestjs/common';
import { ExecutionLoggerService, LogQuery } from './execution-logger.service';

@Controller('api/v1/execution')
export class ExecutionController {
  constructor(private readonly logger: ExecutionLoggerService) {}

  @Get('logs')
  getLogs(@Query() query: LogQuery) {
    return {
      success: true,
      data: this.logger.getLogs(query),
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
}
