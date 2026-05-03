// ── Global Error Middleware ──
// Catches all errors and returns structured JSON responses.

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Known application errors
  if (err instanceof AppError) {
    logger.warn({ err, code: err.code }, 'Application error');
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Zod validation errors (from express middleware)
  if (err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: (err as unknown as { issues: unknown[] }).issues,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Unknown / unhandled errors
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
    timestamp: new Date().toISOString(),
  });
}
