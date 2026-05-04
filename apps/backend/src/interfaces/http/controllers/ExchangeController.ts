// ── Exchange Controller ──

import type { Request, Response, NextFunction } from 'express';
import { ExchangeConnectRequestSchema } from '../dto';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/errors';
import { ExchangeAccountRepository } from '../../../infrastructure/persistence/ExchangeAccountRepository';
import { BinanceAdapter } from '../../../infrastructure/adapters/exchanges/BinanceAdapter';
import { BybitAdapter } from '../../../infrastructure/adapters/exchanges/BybitAdapter';
import { logger } from '../../../shared/logger';

export class ExchangeController {
  constructor(private readonly exchangeRepo: ExchangeAccountRepository) {}

  connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = ExchangeConnectRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ValidationError('Invalid exchange connection request',
          parseResult.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message, code: i.code })));
      }

      const { exchange, name, apiKey, apiSecret, testnet } = parseResult.data;
      const userId = req.user?.userId;
      if (!userId) throw new ValidationError('User not authenticated');

      // Create with encryption
      const account = await this.exchangeRepo.create({
        userId,
        exchange: exchange.toUpperCase(),
        name,
        apiKey,
        apiSecret,
        testnet,
      });

      // Test connection in background
      queueConnectionTest(account.id, userId, this.exchangeRepo, exchange, apiKey, apiSecret, testnet);

      res.status(201).json({
        success: true,
        data: [account],
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  listByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new ValidationError('User not authenticated');

      const accounts = await this.exchangeRepo.findByUser(userId);

      res.status(200).json({
        success: true,
        data: accounts.map((a) => ({
          ...a,
          lastSyncAt: null,
          balances: undefined,
        })),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getBalances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id ?? '');
      const userId = req.user?.userId;
      if (!userId) throw new ValidationError('User not authenticated');

      // Verify ownership before returning data
      const account = await this.exchangeRepo.findById(id);
      if (!account) throw new NotFoundError('Exchange account not found');
      if (account.userId !== userId) throw new ForbiddenError('You can only access your own exchange accounts');

      // TODO: Retrieve adapter from registry, fetch real balances
      res.status(200).json({
        success: true,
        data: { exchange: account.exchange, balances: [], updatedAt: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getPositions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id ?? '');
      const userId = req.user?.userId;
      if (!userId) throw new ValidationError('User not authenticated');

      // Verify ownership before returning data
      const account = await this.exchangeRepo.findById(id);
      if (!account) throw new NotFoundError('Exchange account not found');
      if (account.userId !== userId) throw new ForbiddenError('You can only access your own exchange accounts');

      res.status(200).json({
        success: true,
        data: { exchange: account.exchange, positions: [], updatedAt: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  testConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id ?? '');
      if (!id) throw new ValidationError('Exchange ID required');

      const userId = req.user?.userId;
      if (!userId) throw new ValidationError('User not authenticated');

      // Ownership check enforced by repository
      const creds = await this.exchangeRepo.getDecryptedCredentials(id, userId);
      if (!creds) throw new NotFoundError('Exchange account not found');

      let success = false;
      if (creds.exchange === 'BINANCE') {
        const adapter = new BinanceAdapter({ apiKey: creds.apiKey, apiSecret: creds.apiSecret, testnet: creds.testnet });
        success = await adapter.testConnection();
      } else if (creds.exchange === 'BYBIT') {
        const adapter = new BybitAdapter({ apiKey: creds.apiKey, apiSecret: creds.apiSecret, testnet: creds.testnet });
        success = await adapter.testConnection();
      }

      const status = success ? 'CONNECTED' : 'ERROR';
      await this.exchangeRepo.updateStatus(id, userId, status, success);

      res.status(200).json({
        success: true,
        data: { connected: success, status },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id ?? '');
      if (!id) throw new ValidationError('Exchange ID required');

      // Ownership check: only the account owner can delete
      const account = await this.exchangeRepo.findById(id);
      if (!account) throw new NotFoundError('Exchange account not found');
      if (account.userId !== req.user?.userId) {
        throw new ForbiddenError('You can only delete your own exchange accounts');
      }

      await this.exchangeRepo.delete(id, account.userId);
      res.status(200).json({ success: true, data: { deleted: true }, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  };
}

// ── Background connection test ──
async function queueConnectionTest(
  id: string,
  userId: string,
  repo: ExchangeAccountRepository,
  exchange: string,
  apiKey: string,
  apiSecret: string,
  testnet: boolean,
): Promise<void> {
  try {
    await repo.updateStatus(id, userId, 'TESTING');
    let success = false;

    if (exchange === 'BINANCE') {
      const adapter = new BinanceAdapter({ apiKey, apiSecret, testnet });
      success = await adapter.testConnection();
    } else if (exchange === 'BYBIT') {
      const adapter = new BybitAdapter({ apiKey, apiSecret, testnet });
      success = await adapter.testConnection();
    }

    const status = success ? 'CONNECTED' : 'ERROR';
    await repo.updateStatus(id, userId, status, success);
    logger.info({ exchangeId: id, exchange, success, status }, 'Exchange connection test completed');
  } catch (error) {
    logger.error({ exchangeId: id, error }, 'Exchange connection test failed');
    await repo.updateStatus(id, userId, 'ERROR', false);
  }
}
