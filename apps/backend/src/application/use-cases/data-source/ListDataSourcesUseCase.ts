// ── List DataSources UseCase ──

import type { DataSource } from '../../../domain/entities/DataSource';
import type { DataSourceRepository } from '../../../domain/repositories/DataSourceRepository';

export class ListDataSourcesUseCase {
  constructor(private dataSourceRepository: DataSourceRepository) {}

  async execute(userId: string): Promise<DataSource[]> {
    return this.dataSourceRepository.findByUserId(userId);
  }
}
