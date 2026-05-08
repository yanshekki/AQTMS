import { BaseError } from './base.error';

export class RiskError extends BaseError {
  constructor(
    message: string,
    code: string = 'RISK_CHECK_FAILED',
    statusCode: number = 400,
  ) {
    super(message, code, statusCode);
    this.name = 'RiskError';
  }
}

export class RiskCheckFailedError extends RiskError {
  constructor(message = '風險檢查未通過') {
    super(message, 'RISK_CHECK_FAILED', 400);
  }
}

export class PositionSizeError extends RiskError {
  constructor(message = '倉位大小超過風險限制') {
    super(message, 'POSITION_SIZE_EXCEEDED', 400);
  }
}
