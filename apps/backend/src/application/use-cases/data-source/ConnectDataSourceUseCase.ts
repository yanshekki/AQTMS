// ── Connect DataSource UseCase (Real Telegram Polling) ──

import { DataSource, type DataSourceType } from '../../../domain/entities/DataSource';
import type { DataSourceRepository } from '../../../domain/repositories/DataSourceRepository';
import { InfraError } from '../../../shared/errors';
import { TelegramConnectionService } from '../../services/TelegramConnectionService';
import { logger } from '../../../shared/logger';
import { dataSourceManager } from '../../services/DataSourceManager';
import { TelegramAdapter } from '../../../infrastructure/adapters/datasources/TelegramAdapter';
import { enqueueNews } from '../../../queues/processors/news.processor';

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

      // Start real polling for Telegram
      if (saved.type === 'TELEGRAM') {
        this.startTelegramPolling(saved);
      }

      logger.info(`✅ DataSource connected: ${saved.id} (${saved.type})`);

      return saved;
    } catch (error) {
      logger.error({ error, command }, 'Failed to connect data source');
      throw error;
    }
  }

  private startTelegramPolling(dataSource: DataSource) {
    try {
      const token = dataSource.config.token as string;
      const channel = dataSource.config.channel as string | undefined;

      if (!token) {
        logger.warn(`No token found for DataSource ${dataSource.id}`);
        return;
      }

      const channels = channel ? [channel] : [];

      const adapter = new TelegramAdapter({
        botToken: token,
        channelUsernames: channels,
      });

      adapter.startPolling(async (newsItem) => {
        try {
          await enqueueNews({
            newsId: newsItem.id,
            source: 'TELEGRAM',
            sourceId: newsItem.sourceId,
            content: newsItem.content,
            channelName: newsItem.channelName,
            retryCount: 0,
          });
        } catch (err) {
          logger.warn({ err, dataSourceId: dataSource.id }, 'Failed to enqueue news from Telegram');
        }
      }, 30_000);

      // Register with manager so we can stop it later
      dataSourceManager.startPolling(dataSource.id, 'TELEGRAM', () => {
        adapter.stopPolling();
      });

      logger.info(`📡 Telegram polling started for DataSource: ${dataSource.id}`);
    } catch (error) {
      logger.error({ error, dataSourceId: dataSource.id }, 'Failed to start Telegram polling');
    }
  }
}
