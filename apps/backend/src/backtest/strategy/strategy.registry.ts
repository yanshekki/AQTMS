import { IStrategy } from './strategy.interface';

class StrategyRegistry {
  private strategies = new Map<string, new () => IStrategy>();

  register(name: string, strategyClass: new () => IStrategy) {
    this.strategies.set(name.toLowerCase(), strategyClass);
  }

  getStrategy(name: string): IStrategy {
    const StrategyClass = this.strategies.get(name.toLowerCase());
    if (!StrategyClass) {
      throw new Error(`Strategy not found: ${name}`);
    }
    return new StrategyClass();
  }

  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}

export const strategyRegistry = new StrategyRegistry();
