// ── Connect DataSource UseCase ──

import { DataSource, type DataSourceType } from '../../../domain/entities/DataSource';
import type { DataSourceRepository } from '../../../domain/repositories/DataSourceRepository';
import { InfraError } from '../../../shared/errors';
import { TelegramConnectionService } from '../../services/TelegramConnectionService';
import { XConnectionService } from '../../services/XConnectionService';
import { logger } from '../../../shared/logger';
import { dataSourceManager } from '../../services/DataSourceManager';
import { TelegramAdapter } from '../../../infrastructure/adapters/datasources/TelegramAdapter';
import { XAdapter } from '../../../infrastructure/adapters/datasources/XAdapter';
import { enqueueNews } from '../../../queues/processors/news.processor';

export interface ConnectDataSourceCommand {
  userId: string;
  type: DataSourceType;
  name: string;
  config: Record<string, unknown>;
}

export class ConnectDataSourceUseCase {
  private telegramService = new TelegramConnectionService();
  private xService = new XConnectionService();

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

      if (command.type === 'TELEGRAM') {
        await this.validateTelegram(command.config);
      }

      if (command.type === 'X') {
        await this.validateX(command.config);
      }

      const dataSource = DataSource.create({
        userId: command.userId,
        type: command.type,
        name: command.name,
        config: command.config,
      });

      dataSource.connect();

      const saved = await this.dataSourceRepository.save(dataSource);

      if (saved.type === 'TELEGRAM') {
        this.startTelegramPolling(saved);
      }

      if (saved.type === 'X') {
        this.startXPolling(saved);
      }

      logger.info(`✅ DataSource connected: ${saved.id} (${saved.type})`);

      return saved;
    } catch (error) {
      logger.error({ error, command }, 'Failed to connect data source');
      throw error;
    }
  }

  private async validateTelegram(config: Record<string, unknown>) {
    const token = config.token as string;
    if (!token) {
      throw new InfraError('Telegram Bot Token is required', 'INVALID_CONFIG');
    }

    const validation = await this.telegramService.validateBotToken(token);
    if (!validation.valid) {
      throw new InfraError(`Telegram Bot Token 無效: ${validation.error}`, 'INVALID_TELEGRAM_TOKEN');
    }

    if (config.channel || config.channels) {
      const channel = (config.channel || (config.channels as string[])?.[0]) as string;
      const channelTest = await this.telegramService.testChannelAccess(token, channel);
      if (!channelTest.accessible) {
        throw new InfraError(`無法訪問 Telegram Channel: ${channelTest.error}`, 'TELEGRAM_CHANNEL_ACCESS_DENIED');
      }
    }
  }

  private async validateX(config: Record<string, unknown>) {
    const token = config.token as string;
    if (!token) {
      throw new InfraError('X Bearer Token is required', 'INVALID_CONFIG');
    }

    const validation = await this.xService.validateBearerToken(token);
    if (!validation.valid) {
      throw new InfraError(`X Bearer Token 無效: ${validation.error}`, 'INVALID_X_TOKEN');
    }

    if (config.username || config.usernames) {
      const username = (config.username || (config.usernames as string[])?.[0]) as string;
      const userTest = await this.xService.testUserAccess(token, username);
      if (!userTest.accessible) {
        throw new InfraError(`無法訪問 X 用戶: ${userTest.error}`, 'X_USER_ACCESS_DENIED');
      }
    }
  }

  private startTelegramPolling(dataSource: DataSource) {
    try {
      const token = dataSource.config.token as string;
      const channels = (dataSource.config.channels as string[]) || 
                      (dataSource.config.channel ? [dataSource.config.channel as string] : []);

      if (!token || channels.length === 0) {
        logger.warn(`Incomplete config for Telegram DataSource ${dataSource.id}`);
        return;
      }

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
            ...(newsItem.channelName && { channelName: newsItem.channelName }),
            retryCount: 0,
          });
        } catch (err) {
          logger.warn({ err, dataSourceId: dataSource.id }, 'Failed to enqueue Telegram news');
        }
      }, 30_000);

      dataSourceManager.startPolling(dataSource.id, 'TELEGRAM', () => adapter.stopPolling());
      logger.info(`📡 Telegram polling started for DataSource: ${dataSource.id}`);
    } catch (error) {
      logger.error({ error, dataSourceId: dataSource.id }, 'Failed to start Telegram polling');
    }
  }

  private startXPolling(dataSource: DataSource) {
    try {
      const token = dataSource.config.token as string;
      const usernames = (dataSource.config.usernames as string[]) || 
                       (dataSource.config.username ? [dataSource.config.username as string] : []);

      if (!token || usernames.length === 0) {
        logger.warn(`Incomplete config for X DataSource ${dataSource.id}`);
        return;
      }

      const adapter = new XAdapter({
        bearerToken: token,
        usernames: usernames,
      });

      adapter.startPolling(async (newsItem) => {
        try {
          await enqueueNews({
            newsId: newsItem.id,
            source: 'X',
            sourceId: newsItem.sourceId,
            content: newsItem.content,
            ...(newsItem.authorName && { authorName: newsItem.authorName }),
            retryCount: 0,
          });
        } catch (err) {
          logger.warn({ err, dataSourceId: dataSource.id }, 'Failed to enqueue X news');
        }
      }, 60_000);

      dataSourceManager.startPolling(dataSource.id, 'X', () => adapter.stopPolling());
      logger.info(`📡 X polling started for DataSource: ${dataSource.id}`);
    } catch (error) {
      logger.error({ error, dataSourceId: dataSource.id }, 'Failed to start X polling');
    }
  }
}
