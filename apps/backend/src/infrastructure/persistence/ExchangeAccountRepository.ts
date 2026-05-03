// ── Exchange Account Repository ──
// Handles CRUD for exchange API keys with AES-256-GCM encryption at rest.

import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../../shared/crypto';
import { logger } from '../../shared/logger';

const prisma = new PrismaClient();

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
      },
    });

    logger.info({ exchangeId: account.id, exchange: account.exchange }, 'Exchange account created (encrypted)');

    return {
      id: account.id,
      userId: account.userId,
      exchange: account.exchange,
      name: account.name,
      status: account.status,
      testPassed: account.testPassed,
      testnet: account.testnet,
      createdAt: account.createdAt,
    };
  }

  async findById(id: string): Promise<ExchangeAccountDto | null> {
    const account = await prisma.exchangeAccount.findUnique({ where: { id } });
    if (!account) return null;

    return {
      id: account.id,
      userId: account.userId,
      exchange: account.exchange,
      name: account.name,
      status: account.status,
      testPassed: account.testPassed,
      testnet: account.testnet,
      createdAt: account.createdAt,
    };
  }

  async findByUser(userId: string): Promise<ExchangeAccountDto[]> {
    const accounts = await prisma.exchangeAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((a) => ({
      id: a.id,
      userId: a.userId,
      exchange: a.exchange,
      name: a.name,
      status: a.status,
      testPassed: a.testPassed,
      testnet: a.testnet,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Returns decrypted API credentials — use ONLY when initializing adapters.
   */
  async getDecryptedCredentials(id: string): Promise<{
    apiKey: string;
    apiSecret: string;
    exchange: string;
    testnet: boolean;
  } | null> {
    const account = await prisma.exchangeAccount.findUnique({ where: { id } });
    if (!account) return null;

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

  async updateStatus(id: string, status: string, testPassed?: boolean): Promise<void> {
    await prisma.exchangeAccount.update({
      where: { id },
      data: {
        status,
        ...(testPassed !== undefined ? { testPassed } : {}),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.exchangeAccount.delete({ where: { id } });
    logger.info({ exchangeId: id }, 'Exchange account deleted');
  }
}
