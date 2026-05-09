import { Controller, Get, HttpCode, HttpStatus, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('REDIS_CLIENT') private readonly redis?: any,
  ) {}

  @Get()
  async check() {
    const result: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      dependencies: {},
    };

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      result.dependencies.database = { status: 'ok' };
    } catch (error) {
      result.dependencies.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      result.status = 'degraded';
    }

    // Redis check (optional)
    if (this.redis) {
      try {
        await this.redis.ping();
        result.dependencies.redis = { status: 'ok' };
      } catch (error) {
        result.dependencies.redis = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        result.status = 'degraded';
      }
    } else {
      result.dependencies.redis = { status: 'not_configured' };
    }

    return result;
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready() {
    const checks: Record<string, any> = {
      timestamp: new Date().toISOString(),
    };

    // Database readiness check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok' };
    } catch (error) {
      checks.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      throw new Error('Database not ready');
    }

    // Redis readiness check
    if (this.redis) {
      try {
        await this.redis.ping();
        checks.redis = { status: 'ok' };
      } catch (error) {
        checks.redis = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        throw new Error('Redis not ready');
      }
    }

    return {
      status: 'ready',
      checks,
    };
  }
}
