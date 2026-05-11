// ── Trade Controller (thin — only DTO mapping, calls use-case) ──
// Business logic lives in application/use-cases, NEVER in controllers.

import type { Request, Response, NextFunction } from 'express';
import type { ExecuteTradeUseCase } from '../../../application/use-cases/ExecuteTradeUseCase';
import type { CancelTradeUseCase } from '../../../application/use-cases/CancelTradeUseCase';
import {
  CreateTradeDtoSchema,
  CancelTradeDtoSchema,
  TradeResponseDtoSchema,
} from '../dto';
import { ValidationError } from '../../../shared/errors';
import { AuthenticatedUser } from '../../../types/authenticated-user.interface';

export class TradeController {
  constructor(
    private readonly executeTradeUseCase: ExecuteTradeUseCase,
    private readonly cancelTradeUseCase: CancelTradeUseCase,
  ) {}

  execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = CreateTradeDtoSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ValidationError('Invalid trade request', 
        parseResult.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message, code: i.code })));
      }

      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) throw new ValidationError('User not authenticated');

      const trade = await this.executeTradeUseCase.execute(parseResult.data, user.userId);
      const responseDto = TradeResponseDtoSchema.parse(trade);

      res.status(201).json({
        success: true,
        data: responseDto,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = CancelTradeDtoSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ValidationError('Invalid cancel request', 
        parseResult.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message, code: i.code })));
      }

      const user = req.user as AuthenticatedUser | undefined;
      if (!user?.userId) throw new ValidationError('User not authenticated');

      const trade = await this.cancelTradeUseCase.execute(parseResult.data, user.userId);
      const responseDto = TradeResponseDtoSchema.parse(trade);

      res.status(200).json({
        success: true,
        data: responseDto,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };
}
