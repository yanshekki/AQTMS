import { IStrategy } from './interfaces/strategy.interface';
import { MovingAverageCrossoverStrategy } from './strategies/ma-crossover.strategy';

type StrategyConstructor = new () => IStrategy;

export class StrategyRegistry {
  private strategies = new Map<string, StrategyConstructor>();

  constructor() {
    // 註冊內建策略
    this.register('MA_Crossover', MovingAverageCrossoverStrategy);
  }

  /**
   * 註冊新策略
   */
  register(name: string, strategyClass: StrategyConstructor): void {
    this.strategies.set(name.toUpperCase(), strategyClass);
  }

  /**
   * 取得策略實例
   */
  getStrategy(name: string): IStrategy {
    const StrategyClass = this.strategies.get(name.toUpperCase());
    if (!StrategyClass) {
      throw new Error(`Strategy not found: ${name}`);
    }
    return new StrategyClass();
  }

  /**
   * 取得所有已註冊策略名稱
   */
  getRegisteredStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}

// 匯出單例
export const strategyRegistry = new StrategyRegistry();
