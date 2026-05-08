// ── Connect DataSource UseCase ──

import { DataSource, type DataSourceType } from '../../../domain/entities/DataSource';
import type { DataSourceRepository } from '../../../domain/repositories/DataSourceRepository';
import { InfraError } from '../../../shared/errors';

export interface ConnectDataSourceCommand {
  userId: string;
  type: DataSourceType;
  name: string;
  config: Record<string, unknown>;
}

export class ConnectDataSourceUseCase {
  constructor(private dataSourceRepository: DataSourceRepository) {}

  async execute(command: ConnectDataSourceCommand): Promise<DataSource> {
    // Check if already exists
    const exists = await this.dataSourceRepository.exists(
      command.userId,
      command.type,
      command.name
    );

    if (exists) {
      throw new InfraError(
        `Data source already exists: ${command.type} - ${command.name}`,
        'DATA_SOURCE_ALREADY_EXISTS'
      );
    }

    // Create new DataSource
    const dataSource = DataSource.create({
      userId: command.userId,
      type: command.type,
      name: command.name,
      config: command.config,
    });

    // Save to repository
    return this.dataSourceRepository.save(dataSource);
  }
}
