// ── Connect DataSource UseCase (with auto polling start) ──

import { DataSource, type DataSourceType } from '../../../domain/entities/DataSource';
import type { DataSourceRepository } from '../../../domain/repositories/DataSourceRepository';
import { InfraError } from '../../../shared/errors';
import { TelegramConnectionService } from '../../services/TelegramConnectionService';
import { logger } from '../../../shared/logger';
import { dataSourceManager } from '../../services/DataSourceManager';

export interface ConnectDataSourceCommand {
  userId: string;
  type: DataSourceType;
  name: string;
  config: Record<string, unknown>;
}

export class ConnectDataSourceUseCase {
  private telegramService = new TelegramConnectionService();

  constructor(private dataSourceRepository: DataSourceRepository) {}

  async execute(command: ConnectDataSourceCommand): Promise<DataSource> {
    try {
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

      // Telegram validation
      if (command.type === 'TELEGRAM') {
        const token = command.config.token as string;
        if (!token) {
          throw new InfraError('Telegram Bot Token is required', 'INVALID_CONFIG');
        }

        const validation = await this.telegramService.validateBotToken(token);
        if (!validation.valid) {
          throw new InfraError(`Telegram Bot Token 無效: ${validation.error}`, 'INVALID_TELEGRAM_TOKEN');
        }

        if (command.config.channel) {
          const channelTest = await this.telegramService.testChannelAccess(token, command.config.channel as string);
          if (!channelTest.accessible) {
            throw new InfraError(`無法訪問 Telegram Channel: ${channelTest.error}`, 'TELEGRAM_CHANNEL_ACCESS_DENIED');
          }
        }
      }

      const dataSource = DataSource.create({
        userId: command.userId,
        type: command.type,
        name: command.name,
        config: command.config,
      });

      dataSource.connect();

      const saved = await this.dataSourceRepository.save(dataSource);

      // Auto start polling (placeholder for now)
      this.startPollingForDataSource(saved);

      logger.info(`✅ DataSource connected and polling started: ${saved.id} (${saved.type})`);

      return saved;
    } catch (error) {
      logger.error({ error, command }, 'Failed to connect data source');
      throw error;
    }
  }

  private startPollingForDataSource(dataSource: DataSource) {
    // For now, we just register with DataSourceManager
    // Real polling implementation can be added later
    dataSourceManager.startPolling(dataSource.id, dataSource.type, () => {
      logger.info(`Polling stopped for DataSource: ${dataSource.id}`);
    });

    logger.info(`📡 Registered DataSource for polling: ${dataSource.id} (${dataSource.type})`);
  }
}
