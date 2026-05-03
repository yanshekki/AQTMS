// ── Redis Shared Connection ──

import Redis from 'ioredis';
import { logger } from './logger';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times: number) {
    return Math.min(times * 50, 2000);
  },
});

redis.on('connect', () => logger.info('📦 Redis 連線成功'));
redis.on('error', (err: Error) => logger.error({ err }, 'Redis 錯誤'));
redis.on('ready', () => logger.info('📦 Redis ready'));
redis.on('reconnecting', () => logger.warn('📦 Redis reconnecting...'));

export default redis;
