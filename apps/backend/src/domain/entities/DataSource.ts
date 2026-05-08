// ── DataSource Domain Entity ──

export type DataSourceType = 'TELEGRAM' | 'X' | 'RSS' | 'ONCHAIN';

export type DataSourceStatus = 'PENDING' | 'CONNECTED' | 'ERROR' | 'DISABLED';

export interface DataSourceProps {
  id: string;
  userId: string;
  type: DataSourceType;
  name: string;
  config: Record<string, unknown>;
  status: DataSourceStatus;
  lastError?: string | null;
  lastFetchedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DataSource {
  constructor(private props: DataSourceProps) {}

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get type(): DataSourceType { return this.props.type; }
  get name(): string { return this.props.name; }
  get config(): Record<string, unknown> { return this.props.config; }
  get status(): DataSourceStatus { return this.props.status; }
  get lastError(): string | undefined { return this.props.lastError ?? undefined; }
  get lastFetchedAt(): Date | undefined { return this.props.lastFetchedAt ?? undefined; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  connect(): void {
    this.props.status = 'CONNECTED';
    this.props.lastError = undefined;
  }

  setError(error: string): void {
    this.props.status = 'ERROR';
    this.props.lastError = error;
  }

  disable(): void {
    this.props.status = 'DISABLED';
  }

  updateLastFetched(): void {
    this.props.lastFetchedAt = new Date();
  }

  toPrimitives() {
    return { ...this.props };
  }

  static create(props: Omit<DataSourceProps, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: DataSourceStatus }): DataSource {
    return new DataSource({
      ...props,
      id: crypto.randomUUID(),
      status: props.status ?? 'PENDING',
      lastError: props.lastError ?? undefined,
      lastFetchedAt: props.lastFetchedAt ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
