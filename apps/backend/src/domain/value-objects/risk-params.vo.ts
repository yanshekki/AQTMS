import { ValueObject } from './value-object.base';

export interface RiskParamsProps {
  maxPositionSize: number; // e.g. 0.1 = 10% of portfolio
  dailyLossLimit: number;
  atrMultiplier: number;
  kellyFraction: number;
}

export class RiskParams extends ValueObject<RiskParamsProps> {
  private constructor(props: RiskParamsProps) {
    super(props);
    this.validate();
  }

  static create(props: RiskParamsProps): RiskParams {
    return new RiskParams(props);
  }

  private validate(): void {
    if (this._value.maxPositionSize <= 0 || this._value.maxPositionSize > 1) {
      throw new Error('maxPositionSize must be between 0 and 1');
    }
    if (this._value.dailyLossLimit < 0) {
      throw new Error('dailyLossLimit cannot be negative');
    }
  }

  get maxPositionSize(): number {
    return this._value.maxPositionSize;
  }

  get dailyLossLimit(): number {
    return this._value.dailyLossLimit;
  }

  get atrMultiplier(): number {
    return this._value.atrMultiplier;
  }

  get kellyFraction(): number {
    return this._value.kellyFraction;
  }
}
