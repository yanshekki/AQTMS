// ── Money Value Object (immutable, domain-validated) ──

export class Money {
  private readonly _amount: string;
  private readonly _currency: string;

  private constructor(amount: string, currency: string) {
    this._amount = amount;
    this._currency = currency;
  }

  static create(amount: string, currency: string): Money {
    if (!amount || !currency) {
      throw new Error('Money requires amount and currency');
    }
    if (!/^\d+(\.\d+)?$/.test(amount)) {
      throw new Error(`Invalid money amount: ${amount}`);
    }
    if (currency.length === 0 || currency.length > 10) {
      throw new Error(`Invalid currency: ${currency}`);
    }
    return new Money(amount, currency);
  }

  static zero(currency: string): Money {
    return Money.create('0', currency);
  }

  get amount(): string {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  toString(): string {
    return `${this._amount} ${this._currency}`;
  }

  toJSON(): { amount: string; currency: string } {
    return { amount: this._amount, currency: this._currency };
  }
}
