// ── Exchange Account Repository ──
// Handles CRUD for exchange API keys with AES-256-GCM encryption at rest.

import { prisma } from '../../shared/prisma';
import { encrypt, decrypt } from '../../shared/crypto';
import { logger } from '../../shared/logger';

// using shared prisma singleton

export interface CreateExchangeAccountDto {
  userId: string;
  exchange: string;
  name: string;
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}

export interface ExchangeAccountDto {
  id: string;
  userId: string;
  exchange: string;
  name: string;
  status: string;
  testPassed: boolean;
  testnet: boolean;
  isPaperTrading?: boolean; // 新增
  createdAt: Date;
}

export class ExchangeAccountRepository {
  private readonly encryptionKey: string;

  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
  }

  async create(data: CreateExchangeAccountDto): Promise<ExchangeAccountDto> {
    const encryptedKey = encrypt(data.apiKey, this.encryptionKey);
    const encryptedSecret = encrypt(data.apiSecret, this.encryptionKey);

    const account = await prisma.exchangeAccount.create({
      data: {
        userId: data.userId,
        exchange: data.exchange,
        name: data.name,
        apiKey: encryptedKey,
        apiSecret: encryptedSecret,
        testnet: data.testnet ?? false,
        isPaperTrading: false, // 預設關閉
      },
    });

    logger.info({ exchangeId: account.id, exchange: account.exchange }, 'Exchange account created (encrypted)');

    return this.mapToDto(account);
  }

  async findById(id: string): Promise<ExchangeAccountDto | null> {
    const account = await prisma.exchangeAccount.findUnique({ where: { id } });
    if (!account) return null;
    return this.mapToDto(account);
  }

  async findByUser(userId: string): Promise<ExchangeAccountDto[]> {
    const accounts = await prisma.exchangeAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((a) => this.mapToDto(a));
  }

  async findByIdAndUserId(accountId: string, userId: string) {
    return prisma.exchangeAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });
  }

  async update(accountId: string, data: { isPaperTrading?: boolean }) {
    return prisma.exchangeAccount.update({
      where: { id: accountId },
      data: {
        ...(data.isPaperTrading !== undefined && { isPaperTrading: data.isPaperTrading }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Returns decrypted API credentials — use ONLY when initializing adapters.
   */
  async getDecryptedCredentials(id: string, userId: string): Promise<{
    apiKey: string;
    apiSecret: string;
    exchange: string;
    testnet: boolean;
  } | null> {
    const account = await prisma.exchangeAccount.findUnique({ where: { id } });
    if (!account) return null;

    if (account.userId !== userId) {
      logger.warn({ exchangeId: id, requestUserId: userId, ownerUserId: account.userId }, 'Attempted cross-user access');
      return null;
    }

    try {
      const apiKey = decrypt(account.apiKey, this.encryptionKey);
      const apiSecret = decrypt(account.apiSecret, this.encryptionKey);

      return {
        apiKey,
        apiSecret,
        exchange: account.exchange,
        testnet: account.testnet,
      };
    } catch (error) {
      logger.error({ exchangeId: id, error }, 'Failed to decrypt exchange credentials');
      return null;
    }
  }

  async updateStatus(id: string, userId: string, status: string, testPassed?: boolean): Promise<void> {
    const account = await prisma.exchangeAccount.findUnique({ where: { id } });
    if (!account || account.userId !== userId) return;

    await prisma.exchangeAccount.update({
      where: { id },
      data: {
        status,
        ...(testPassed !== undefined ? { testPassed } : {}),
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const account = await prisma.exchangeAccount.findUnique({ where: { id } });
    if (!account || account.userId !== userId) return;

    await prisma.exchangeAccount.delete({ where: { id } });
    logger.info({ exchangeId: id }, 'Exchange account deleted');
  }

  private mapToDto(account: any): ExchangeAccountDto {
    return {
      id: account.id,
      userId: account.userId,
      exchange: account.exchange,
      name: account.name,
      status: account.status,
      testPassed: account.testPassed,
      testnet: account.testnet,
      isPaperTrading: account.isPaperTrading,
      createdAt: account.createdAt,
    };
  }
}
