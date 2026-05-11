export class Signal {
  constructor(
    public readonly id: string,
    public readonly userId: string | null,
    public readonly source: string,
    public readonly symbol: string,
    public readonly action: string,
    public readonly score: number,
    public readonly confidence?: number,
    public readonly metadata?: any,
    public readonly timestamp: Date = new Date(),
  ) {}
}
