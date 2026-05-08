// ── Delete DataSource UseCase ──

import type { DataSourceRepository } from '../../../domain/repositories/DataSourceRepository';
import { InfraError } from '../../../shared/errors';

export class DeleteDataSourceUseCase {
  constructor(private dataSourceRepository: DataSourceRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    const dataSource = await this.dataSourceRepository.findById(id);

    if (!dataSource) {
      throw new InfraError('Data source not found', 'DATA_SOURCE_NOT_FOUND');
    }

    if (dataSource.userId !== userId) {
      throw new InfraError('Unauthorized to delete this data source', 'UNAUTHORIZED');
    }

    await this.dataSourceRepository.delete(id);
  }
}
