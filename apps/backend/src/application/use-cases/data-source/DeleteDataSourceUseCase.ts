// ── Delete DataSource UseCase (with polling stop) ──

import type { DataSourceRepository } from '../../../domain/repositories/DataSourceRepository';
import { InfraError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { dataSourceManager } from '../../services/DataSourceManager';

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

    // Stop polling if it's running
    dataSourceManager.stopPolling(id);

    await this.dataSourceRepository.delete(id);

    logger.info(`🗑️ DataSource deleted and polling stopped: ${id} (${dataSource.type})`);
  }
}
