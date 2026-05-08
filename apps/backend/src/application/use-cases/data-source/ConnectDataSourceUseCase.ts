// ── Connect DataSource UseCase (with validation) ──

import { DataSource, type DataSourceType } from '../../../domain/entities/DataSource';
import type { DataSourceRepository } from '../../../domain/repositories/DataSourceRepository';
import { InfraError } from '../../../shared/errors';
import { TelegramConnectionService } from '../../services/TelegramConnectionService';

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

    // Telegram specific validation
    if (command.type === 'TELEGRAM') {
      const token = command.config.token as string;
      if (!token) {
        throw new InfraError('Telegram Bot Token is required', 'INVALID_CONFIG');
      }

      const validation = await this.telegramService.validateBotToken(token);
      if (!validation.valid) {
        throw new InfraError(
          `Telegram Bot Token 無效: ${validation.error}`,
          'INVALID_TELEGRAM_TOKEN'
        );
      }

      // Optional: test channel access if provided
      if (command.config.channel) {
        const channelTest = await this.telegramService.testChannelAccess(
          token,
          command.config.channel as string
        );
        if (!channelTest.accessible) {
          throw new InfraError(
            `無法訪問 Telegram Channel: ${channelTest.error}`,
            'TELEGRAM_CHANNEL_ACCESS_DENIED'
          );
        }
      }
    }

    // Create new DataSource
    const dataSource = DataSource.create({
      userId: command.userId,
      type: command.type,
      name: command.name,
      config: command.config,
    });

    // Mark as connected after successful validation
    dataSource.connect();

    // Save to repository
    return this.dataSourceRepository.save(dataSource);
  }
}
