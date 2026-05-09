import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service'; // 假設你的 PrismaService 路徑

@Controller('health')
export class HealthController {
  constructor(private readonly prisma?: PrismaService) {}

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
  @HttpCode(HttpStatus.OK)
  async ready() {
    const checks: Record<string, any> = {
      timestamp: new Date().toISOString(),
    };

    // 資料庫連線檢查
    if (this.prisma) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        checks.database = { status: 'ok' };
      } catch (error) {
        checks.database = { status: 'error', message: error.message };
        // 如果資料庫連線失敗，回傳 503
        throw new Error('Database not ready');
      }
    } else {
      checks.database = { status: 'not_configured' };
    }

    return {
      status: 'ready',
      checks,
    };
  }
}
