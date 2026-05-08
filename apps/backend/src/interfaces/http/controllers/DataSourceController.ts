// ── DataSource Controller (Final Fixed) ──

import type { Request, Response, NextFunction } from 'express';
import { ConnectDataSourceUseCase } from '../../../application/use-cases/data-source/ConnectDataSourceUseCase';
import { ListDataSourcesUseCase } from '../../../application/use-cases/data-source/ListDataSourcesUseCase';
import { DeleteDataSourceUseCase } from '../../../application/use-cases/data-source/DeleteDataSourceUseCase';
import type { DataSourceType } from '../../../domain/entities/DataSource';

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

      const { type: rawType, name, config } = req.body;

      const allowedTypes: DataSourceType[] = ['TELEGRAM', 'X', 'RSS', 'ONCHAIN'];
      if (!allowedTypes.includes(rawType as any)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE' } });
      }
      const type = rawType as DataSourceType;

      const dataSource = await this.connectDataSourceUseCase.execute({
        userId,
        type,
        name,
        config: config ?? {},
      });

      res.status(201).json({ success: true, data: dataSource.toPrimitives(), timestamp: new Date().toISOString() });
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
      res.json({ success: true, data: dataSources.map((ds) => ds.toPrimitives()), timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!userId || !id) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST' } });
      }

      await this.deleteDataSourceUseCase.execute(id, userId);
      res.json({ success: true, data: { message: 'Data source deleted successfully' }, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  };
}
