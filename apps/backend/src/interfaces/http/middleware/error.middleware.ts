// ── Global Error Middleware ──
// Catches all errors and returns structured JSON responses.
// Supports i18n via Accept-Language header.

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { detectLang, t } from '../../../shared/i18n';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const lang = detectLang(req);

  // Known application errors
  if (err instanceof AppError) {
    logger.warn({ err, code: err.code }, 'Application error');
    const message = t(err.code, lang);
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: message !== err.code ? message : err.message,
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
        message: t('validation.failed', lang),
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
        ? t('internal_error', lang)
        : err.message,
    },
    timestamp: new Date().toISOString(),
  });
}
