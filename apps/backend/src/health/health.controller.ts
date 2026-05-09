import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('ready')
  ready() {
    // 這裡可以加入更嚴格的就緒檢查（例如資料庫連線、外部服務等）
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
