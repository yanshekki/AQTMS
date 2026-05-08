import { BaseError } from './base.error';

export class OrderError extends BaseError {
  constructor(
    message: string,
    code: string = 'ORDER_ERROR',
    statusCode: number = 400,
  ) {
    super(message, code, statusCode);
    this.name = 'OrderError';
  }
}

export class OrderExecutionError extends OrderError {
  constructor(message = '訂單執行失敗') {
    super(message, 'ORDER_EXECUTION_FAILED', 500);
  }
}

export class OrderValidationError extends OrderError {
  constructor(message = '訂單參數驗證失敗') {
    super(message, 'ORDER_VALIDATION_FAILED', 400);
  }
}
