// ── DataSource Controller ──

import type { Request, Response, NextFunction } from 'express';
import { ConnectDataSourceUseCase } from '../../../application/use-cases/data-source/ConnectDataSourceUseCase';
import { ListDataSourcesUseCase } from '../../../application/use-cases/data-source/ListDataSourcesUseCase';
import { DeleteDataSourceUseCase } from '../../../application/use-cases/data-source/DeleteDataSourceUseCase';
import { detectLang, t } from '../../../shared/i18n';

export class DataSourceController {
  constructor(
    private connectDataSourceUseCase: ConnectDataSourceUseCase,
    private listDataSourcesUseCase: ListDataSourcesUseCase,
    private deleteDataSourceUseCase: DeleteDataSourceUseCase
  ) {}

  connect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const { type, name, config } = req.body;

      const dataSource = await this.connectDataSourceUseCase.execute({
        userId,
        type,
        name,
        config,
      });

      res.status(201).json({
        success: true,
        data: dataSource.toPrimitives(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const dataSources = await this.listDataSourcesUseCase.execute(userId);

      res.json({
        success: true,
        data: dataSources.map((ds) => ds.toPrimitives()),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      await this.deleteDataSourceUseCase.execute(id, userId);

      res.json({
        success: true,
        data: { message: 'Data source deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
