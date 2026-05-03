// ── Metrics Middleware ──
// Collects HTTP request metrics (count + duration) for Prometheus.

import type { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../../../shared/metrics';
import { logger } from '../../../shared/logger';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Hook into response finish to record metrics
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path ?? req.path ?? 'unknown';
    const method = req.method;

    httpRequestsTotal.inc({ method, route, status: res.statusCode.toString() });
    httpRequestDuration.observe({ method, route }, duration);

    // Log slow requests
    if (duration > 2) {
      logger.warn({ method, route, duration, status: res.statusCode }, 'Slow request');
    }
  });

  next();
}
