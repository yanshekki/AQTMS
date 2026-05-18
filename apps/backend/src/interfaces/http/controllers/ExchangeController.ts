// ── Exchange Controller ──

import type { Request, Response, NextFunction } from 'express';
import { ExchangeConnectRequestSchema } from '../dto';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/errors';
import { ExchangeAccountRepository } from '../../../infrastructure/persistence/ExchangeAccountRepository';
import { CcxtExchangeAdapter } from '../../../infrastructure/adapters/exchange/ccxt-exchange.adapter';
import { logger } from '../../../shared/logger';
import { AuthenticatedUser } from '../../../types/authenticated-user.interface';

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
      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) throw new ValidationError('User not authenticated');

      const account = await this.exchangeRepo.create({
        userId: user.userId,
        exchange: exchange.toUpperCase(),
        name,
        apiKey,
        apiSecret,
        testnet,
      });

      queueConnectionTest(account.id, user.userId, this.exchangeRepo, exchange, apiKey, apiSecret, testnet);

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
      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) throw new ValidationError('User not authenticated');

      const accounts = await this.exchangeRepo.findByUser(user.userId);

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
      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) throw new ValidationError('User not authenticated');

      const account = await this.exchangeRepo.findById(id);
      if (!account) throw new NotFoundError('Exchange account not found');
      if (account.userId !== user.userId) throw new ForbiddenError('You can only access your own exchange accounts');

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
      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) throw new ValidationError('User not authenticated');

      const account = await this.exchangeRepo.findById(id);
      if (!account) throw new NotFoundError('Exchange account not found');
      if (account.userId !== user.userId) throw new ForbiddenError('You can only access your own exchange accounts');

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

      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) throw new ValidationError('User not authenticated');

      const creds = await this.exchangeRepo.getDecryptedCredentials(id, user.userId);
      if (!creds) throw new NotFoundError('Exchange account not found');

      let success = false;
      try {
        const adapter = new CcxtExchangeAdapter();
        await adapter.initialize({
          exchange: creds.exchange.toLowerCase(),
          apiKey: creds.apiKey,
          apiSecret: creds.apiSecret,
          testnet: creds.testnet,
        });
        success = await adapter.testConnection(creds.exchange.toLowerCase(), creds.testnet);
      } catch (e) {
        success = false;
      }

      const status = success ? 'CONNECTED' : 'ERROR';
      await this.exchangeRepo.updateStatus(id, user.userId, status, success);

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

    try {
      const adapter = new CcxtExchangeAdapter();
      await adapter.initialize({
        exchange: exchange.toLowerCase(),
        apiKey,
        apiSecret,
        testnet,
      });
      success = await adapter.testConnection(exchange.toLowerCase(), testnet);
    } catch (e) {
      success = false;
    }

    const status = success ? 'CONNECTED' : 'ERROR';
    await repo.updateStatus(id, userId, status, success);
    logger.info({ exchangeId: id, exchange, success, status }, 'Exchange connection test completed');
  } catch (error) {
    logger.error({ exchangeId: id, error }, 'Exchange connection test failed');
    await repo.updateStatus(id, userId, 'ERROR', false);
  }
}
