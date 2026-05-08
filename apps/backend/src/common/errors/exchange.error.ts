import { BaseError } from './base.error';

export class ExchangeError extends BaseError {
  constructor(
    message: string,
    code: string = 'EXCHANGE_ERROR',
    statusCode: number = 502,
  ) {
    super(message, code, statusCode);
    this.name = 'ExchangeError';
  }
}

export class ExchangeConnectionError extends ExchangeError {
  constructor(message = '無法連接到交易所') {
    super(message, 'EXCHANGE_CONNECTION_ERROR', 503);
  }
}

export class ExchangeOrderError extends ExchangeError {
  constructor(message = '交易所下單失敗') {
    super(message, 'EXCHANGE_ORDER_ERROR', 400);
  }
}
