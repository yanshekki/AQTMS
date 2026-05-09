import { Throttle } from '@nestjs/throttler';

/**
 * Strict rate limit for sensitive operations (e.g. placing orders)
 * Default: 5 requests per 10 seconds
 */
export const StrictThrottle = () =>
  Throttle({
    default: {
      limit: 5,
      ttl: 10000, // 10 seconds
    },
  });
