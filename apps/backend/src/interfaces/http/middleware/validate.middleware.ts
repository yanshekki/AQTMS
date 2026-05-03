// ── DTO Validation Middleware ──
// Validates request body/payload against Zod schemas.
// Throws ValidationError (caught by error middleware) on failure.

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../../../shared/errors';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = req[target];
    const result = schema.safeParse(data);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      throw new ValidationError(
        `Validation failed for ${target}`,
        details,
      );
    }

    // Replace with parsed (coerced, defaulted) data
    req[target] = result.data;
    next();
  };
}
