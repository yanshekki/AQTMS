// ── DataSource Repository Interface ──

import type { DataSource, DataSourceType, DataSourceStatus } from '../entities/DataSource';

export interface DataSourceRepository {
  findById(id: string): Promise<DataSource | null>;
  findByUserId(userId: string): Promise<DataSource[]>;
  findByUserAndType(userId: string, type: DataSourceType): Promise<DataSource[]>;
  save(dataSource: DataSource): Promise<DataSource>;
  update(dataSource: DataSource): Promise<DataSource>;
  delete(id: string): Promise<void>;
  exists(userId: string, type: DataSourceType, name: string): Promise<boolean>;
}
