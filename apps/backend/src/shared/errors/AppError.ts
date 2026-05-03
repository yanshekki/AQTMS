// ── Domain Errors (base + hierarchy) ──

export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>[] | undefined;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Record<string, unknown>[] | undefined,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DomainError extends AppError {
  constructor(message: string, code = 'DOMAIN_ERROR', details?: Record<string, unknown>[]) {
    super(message, code, 400, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>[]) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: Record<string, unknown>[]) {
    super(message, 'NOT_FOUND', 404, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>[]) {
    super(message, 'UNAUTHORIZED', 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>[]) {
    super(message, 'FORBIDDEN', 403, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>[]) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class InfraError extends AppError {
  constructor(message: string, code = 'INFRA_ERROR', details?: Record<string, unknown>[]) {
    super(message, code, 500, details);
  }
}

export class CircuitBreakerError extends AppError {
  constructor(message: string, details?: Record<string, unknown>[]) {
    super(message, 'CIRCUIT_BREAKER_OPEN', 503, details);
  }
}
