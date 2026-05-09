import { Injectable } from '@nestjs/common';
import { strategyRegistry } from './strategy.registry';
import { HistoricalDataService } from '../data/historical-data.service';

// ... existing interfaces

@Injectable()
export class BacktestService {
  constructor(private readonly historicalDataService: HistoricalDataService) {}

  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    // ... existing data fetching logic ...

    // 使用 Registry 取得策略
    const strategy = strategyRegistry.getStrategy(request.strategyName);
    strategy.initialize(request.strategyParams);

    // ... 後續回測邏輯保持不變 ...

    // 注意：後續需把原本的 if-else 建立策略的程式碼移除
  }

  // ... 其他方法 ...
}
