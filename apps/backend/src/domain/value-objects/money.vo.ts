import { ValueObject } from './value-object.base';

export class Money extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
    if (value < 0) {
      throw new Error('Money cannot be negative');
    }
  }

  static create(value: number): Money {
    return new Money(value);
  }

  add(other: Money): Money {
    return Money.create(this.value + other.value);
  }

  subtract(other: Money): Money {
    return Money.create(this.value - other.value);
  }

  multiply(factor: number): Money {
    return Money.create(this.value * factor);
  }

  get value(): number {
    return this._value;
  }
}
