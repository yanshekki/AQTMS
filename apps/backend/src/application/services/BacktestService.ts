// ── Backtesting Engine ──
// Fetches historical klines from Binance public API, simulates trading strategies,
// and generates detailed performance reports.

import { logger } from '../../shared/logger';

export interface BacktestParams {
  symbol: string;
  startDate: string;       // ISO date
  endDate: string;         // ISO date
  initialCapital: number;
  feeRate: number;         // e.g., 0.001 = 0.1%
  slippagePercent: number; // e.g., 0.05 = 0.05%
  strategyType: 'SIMPLE_MA_CROSS' | 'SCORE_THRESHOLD' | 'CUSTOM';
  strategyConfig: Record<string, unknown>;
  maxPositionSize?: number;
  exchange: 'BINANCE' | 'BYBIT';
}

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeRecord {
  timestamp: Date;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  notional: number;
  fee: number;
  pnl?: number;
  pnlPercent?: number;
  reason: string;
}

export interface BacktestReport {
  id: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;       // %
  totalPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;           // %
  avgWin: number;
  avgLoss: number;
  profitFactor: number;      // gross profit / gross loss
  maxDrawdown: number;       // %
  maxDrawdownDuration: number; // candles
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  totalFees: number;
  equityCurve: Array<{ time: number; value: number }>;
  drawdownCurve: Array<{ time: number; drawdown: number }>;
  monthlyReturns: Array<{ month: string; return: number }>;
  trades: TradeRecord[];
  parameters: BacktestParams;
}

interface Strategy {
  name: string;
  evaluate(kline: Kline, index: number, history: Kline[], position: { side: 'BUY' | 'SELL' | null; entryPrice: number }): {
    action: 'BUY' | 'SELL' | 'HOLD';
    quantity?: number;
    reason: string;
  };
}

export class BacktestService {
  private readonly binanceBase = 'https://api.binance.com';

  async runBacktest(params: BacktestParams): Promise<BacktestReport> {
    logger.info({ symbol: params.symbol, start: params.startDate, end: params.endDate }, 'Starting backtest');

    // 1. Fetch historical klines
    const klines = await this.fetchKlines(
      params.symbol,
      params.startDate,
      params.endDate,
    );

    if (klines.length < 50) {
      throw new Error(`Insufficient data: only ${klines.length} candles available`);
    }

    // 2. Build strategy
    const strategy = this.buildStrategy(params.strategyType, params.strategyConfig);

    // 3. Run simulation
    const result = this.simulate(klines, strategy, params);

    // 4. Calculate metrics
    const report = this.generateReport(result, params);

    logger.info({
      symbol: params.symbol,
      totalReturn: report.totalReturn,
      winRate: report.winRate,
      sharpe: report.sharpeRatio,
      trades: report.totalTrades,
    }, 'Backtest complete');

    return report;
  }

  // ══════════════════════════════════════════════
  // Historical Data Fetcher
  // ══════════════════════════════════════════════

  async fetchKlines(symbol: string, startDate: string, endDate: string): Promise<Kline[]> {
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const interval = '1h';
    const limit = 1000;

    const allKlines: Kline[] = [];
    let currentStart = startMs;

    while (currentStart < endMs) {
      const url = `${this.binanceBase}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${currentStart}&endTime=${endMs}&limit=${limit}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status}`);
        }

        const data = (await response.json()) as Array<[
          number, string, string, string, string, string, number, string, number, string, string, string
        ]>;

        if (!Array.isArray(data) || data.length === 0) break;

        for (const row of data) {
          allKlines.push({
            openTime: row[0],
            open: parseFloat(row[1]),
            high: parseFloat(row[2]),
            low: parseFloat(row[3]),
            close: parseFloat(row[4]),
            volume: parseFloat(row[5]),
          });
        }

        // Move to next batch
        currentStart = data[data.length - 1]![0] + 1;

        // Rate limit: wait 200ms between requests
        await new Promise((r) => setTimeout(r, 200));
      } catch (error) {
        logger.warn({ error, currentStart }, 'Failed to fetch klines batch, retrying...');
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return allKlines.sort((a, b) => a.openTime - b.openTime);
  }

  // ══════════════════════════════════════════════
  // Strategy Builder
  // ══════════════════════════════════════════════

  private buildStrategy(type: string, config: Record<string, unknown>): Strategy {
    switch (type) {
      case 'SIMPLE_MA_CROSS':
        return this.maCrossStrategy(config);
      case 'SCORE_THRESHOLD':
        return this.scoreThresholdStrategy(config);
      default:
        return this.maCrossStrategy(config);
    }
  }

  private maCrossStrategy(config: Record<string, unknown>): Strategy {
    const fastPeriod = (config.fastPeriod as number) ?? 9;
    const slowPeriod = (config.slowPeriod as number) ?? 21;
    const positionSize = (config.positionSize as number) ?? 0.1; // 10% of capital

    return {
      name: `MA Cross (${fastPeriod}/${slowPeriod})`,
      evaluate: (_kline, index, history, position) => {
        if (index < Math.max(fastPeriod, slowPeriod)) {
          return { action: 'HOLD', reason: 'Insufficient data' };
        }

        const fastMA = this.sma(history.slice(index - fastPeriod, index + 1).map((k) => k.close));
        const slowMA = this.sma(history.slice(index - slowPeriod, index + 1).map((k) => k.close));
        const prevFastMA = this.sma(history.slice(index - 1 - fastPeriod, index).map((k) => k.close));
        const prevSlowMA = this.sma(history.slice(index - 1 - slowPeriod, index).map((k) => k.close));

        // Golden cross: fast crosses above slow
        if (prevFastMA <= prevSlowMA && fastMA > slowMA && position.side !== 'BUY') {
          return { action: 'BUY', quantity: positionSize, reason: `Golden cross: MA${fastPeriod} > MA${slowPeriod}` };
        }

        // Death cross: fast crosses below slow
        if (prevFastMA >= prevSlowMA && fastMA < slowMA && position.side === 'BUY') {
          return { action: 'SELL', reason: `Death cross: MA${fastPeriod} < MA${slowPeriod}` };
        }

        return { action: 'HOLD', reason: 'No signal' };
      },
    };
  }

  private scoreThresholdStrategy(config: Record<string, unknown>): Strategy {
    const buyThreshold = (config.buyThreshold as number) ?? 80;
    const sellThreshold = (config.sellThreshold as number) ?? 20;

    return {
      name: `Score Threshold (Buy>${buyThreshold}, Sell<${sellThreshold})`,
      evaluate: () => {
        // Placeholder: in real use, this would call the scoring engine
        const randomScore = Math.random() * 100;
        if (randomScore > buyThreshold) {
          return { action: 'BUY', quantity: 0.1, reason: `Score ${randomScore.toFixed(0)} > ${buyThreshold}` };
        }
        if (randomScore < sellThreshold) {
          return { action: 'SELL', reason: `Score ${randomScore.toFixed(0)} < ${sellThreshold}` };
        }
        return { action: 'HOLD', reason: 'No signal' };
      },
    };
  }

  // ══════════════════════════════════════════════
  // Simulation Engine
  // ══════════════════════════════════════════════

  private simulate(
    klines: Kline[],
    strategy: Strategy,
    params: BacktestParams,
  ): {
    trades: TradeRecord[];
    equityCurve: Array<{ time: number; value: number }>;
    drawdownCurve: Array<{ time: number; drawdown: number }>;
  } {
    let capital = params.initialCapital;
    let peak = capital;
    let _maxDrawdown = 0;

    const trades: TradeRecord[] = [];
    const equityCurve: Array<{ time: number; value: number }> = [];
    const drawdownCurve: Array<{ time: number; drawdown: number }> = [];
    const position: { side: 'BUY' | 'SELL' | null; entryPrice: number; quantity: number } = {
      side: null, entryPrice: 0, quantity: 0,
    };

    for (let i = 0; i < klines.length; i++) {
      const kline = klines[i]!;
      const decision = strategy.evaluate(kline, i, klines, position);

      // Execute buy
      if (decision.action === 'BUY' && position.side === null) {
        const maxNotional = params.maxPositionSize
          ? Math.min(capital, params.maxPositionSize)
          : capital * (decision.quantity ?? 0.1);

        const price = kline.close * (1 + params.slippagePercent / 100);
        const quantity = maxNotional / price;
        const fee = maxNotional * params.feeRate;

        position.side = 'BUY';
        position.entryPrice = price;
        position.quantity = quantity;
        capital -= fee;

        trades.push({
          timestamp: new Date(kline.openTime),
          symbol: params.symbol,
          side: 'BUY',
          quantity,
          price,
          notional: maxNotional,
          fee,
          reason: decision.reason,
        });
      }

      // Execute sell
      if (decision.action === 'SELL' && position.side === 'BUY') {
        const price = kline.close * (1 - params.slippagePercent / 100);
        const notional = position.quantity * price;
        const fee = notional * params.feeRate;
        const pnl = notional - position.quantity * position.entryPrice;
        const pnlPercent = ((price - position.entryPrice) / position.entryPrice) * 100;

        capital += notional - fee;

        trades.push({
          timestamp: new Date(kline.openTime),
          symbol: params.symbol,
          side: 'SELL',
          quantity: position.quantity,
          price,
          notional,
          fee,
          pnl,
          pnlPercent,
          reason: decision.reason,
        });

        position.side = null;
        position.quantity = 0;
      }

      // Track equity curve (include unrealized PnL)
      let equity = capital;
      if (position.side === 'BUY') {
        equity += position.quantity * kline.close;
      }

      equityCurve.push({ time: kline.openTime, value: equity });

      if (equity > peak) {
        peak = equity;
      }
      const dd = peak > 0 ? (peak - equity) / peak * 100 : 0;
      if (dd > _maxDrawdown) _maxDrawdown = dd;
      drawdownCurve.push({ time: kline.openTime, drawdown: dd });
    }

    // Close any remaining position at last price
    if (position.side === 'BUY') {
      const lastKline = klines[klines.length - 1]!;
      const price = lastKline.close;
      const notional = position.quantity * price;
      const fee = notional * params.feeRate;
      const pnl = notional - position.quantity * position.entryPrice;
      const pnlPercent = ((price - position.entryPrice) / position.entryPrice) * 100;

      capital += notional - fee;
      trades.push({
        timestamp: new Date(lastKline.openTime),
        symbol: params.symbol,
        side: 'SELL',
        quantity: position.quantity,
        price,
        notional,
        fee,
        pnl,
        pnlPercent,
        reason: 'Position closed at end of backtest',
      });
    }

    return { trades, equityCurve, drawdownCurve };
  }

  // ══════════════════════════════════════════════
  // Report Generator
  // ══════════════════════════════════════════════

  private generateReport(
    result: { trades: TradeRecord[]; equityCurve: Array<{ time: number; value: number }>; drawdownCurve: Array<{ time: number; drawdown: number }> },
    params: BacktestParams,
  ): BacktestReport {
    const completedTrades = result.trades.filter((t) => t.side === 'SELL' && t.pnl !== undefined);
    const winningTrades = completedTrades.filter((t) => (t.pnl ?? 0) > 0);
    const losingTrades = completedTrades.filter((t) => (t.pnl ?? 0) <= 0);

    const totalPnL = completedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const grossProfit = winningTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((s, t) => s + (t.pnl ?? 0), 0));
    const totalFees = result.trades.reduce((s, t) => s + t.fee, 0);

    const winRate = completedTrades.length > 0
      ? (winningTrades.length / completedTrades.length) * 100
      : 0;

    const avgWin = winningTrades.length > 0
      ? grossProfit / winningTrades.length
      : 0;

    const avgLoss = losingTrades.length > 0
      ? grossLoss / losingTrades.length
      : 0;

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Returns array for Sharpe/Sortino
    const returns: number[] = [];
    for (let i = 1; i < result.equityCurve.length; i++) {
      const prev = result.equityCurve[i - 1]!.value;
      const curr = result.equityCurve[i]!.value;
      if (prev > 0) returns.push((curr - prev) / prev);
    }

    const meanReturn = returns.length > 0
      ? returns.reduce((s, r) => s + r, 0) / returns.length
      : 0;

    const stdReturn = this.stdDev(returns);
    const sharpeRatio = stdReturn > 0 ? (meanReturn * Math.sqrt(365 * 24)) / stdReturn : 0;

    // Sortino: only downside deviation
    const downsideReturns = returns.filter((r) => r < 0);
    const downsideStd = this.stdDev(downsideReturns);
    const sortinoRatio = downsideStd > 0 ? (meanReturn * Math.sqrt(365 * 24)) / downsideStd : 0;

    // Calmar
    const maxDrawdown = Math.max(...result.drawdownCurve.map((d) => d.drawdown), 0);
    const annualReturn = ((result.equityCurve[result.equityCurve.length - 1]!.value / params.initialCapital - 1) * (365 / Math.max(1, (result.equityCurve.length / 24))));
    // maxDrawdown is in percent (0-100), annualReturn is decimal — convert to same unit
    const calmarRatio = maxDrawdown > 0 ? (annualReturn * 100) / maxDrawdown : 0;

    // Monthly returns
    const monthlyMap = new Map<string, number>();
    for (const entry of result.equityCurve) {
      const month = new Date(entry.time).toISOString().slice(0, 7);
      if (!monthlyMap.has(month)) monthlyMap.set(month, entry.value);
    }
    const monthlyReturns: Array<{ month: string; return: number }> = [];
    let prevValue = params.initialCapital;
    for (const [month, value] of monthlyMap) {
      monthlyReturns.push({ month, return: ((value - prevValue) / prevValue) * 100 });
      prevValue = value;
    }

    const finalCapital = result.equityCurve[result.equityCurve.length - 1]?.value ?? params.initialCapital;
    const totalReturn = ((finalCapital - params.initialCapital) / params.initialCapital) * 100;

    // Max drawdown duration
    let maxDDDuration = 0;
    let currentDDStart = -1;
    for (let i = 0; i < result.drawdownCurve.length; i++) {
      if (result.drawdownCurve[i]!.drawdown > 0 && currentDDStart === -1) {
        currentDDStart = i;
      } else if (result.drawdownCurve[i]!.drawdown === 0 && currentDDStart !== -1) {
        maxDDDuration = Math.max(maxDDDuration, i - currentDDStart);
        currentDDStart = -1;
      }
    }

    return {
      id: crypto.randomUUID(),
      symbol: params.symbol,
      startDate: params.startDate,
      endDate: params.endDate,
      initialCapital: params.initialCapital,
      finalCapital: Math.round(finalCapital * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100,
      totalPnL: Math.round(totalPnL * 100) / 100,
      totalTrades: completedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: Math.round(winRate * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      maxDrawdownDuration: maxDDDuration,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      sortinoRatio: Math.round(sortinoRatio * 100) / 100,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      equityCurve: result.equityCurve.slice(0, 500), // Limit for response size
      drawdownCurve: result.drawdownCurve.slice(0, 500),
      monthlyReturns: monthlyReturns.slice(-12),
      trades: completedTrades.slice(-100),
      parameters: params,
    };
  }

  // ══════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════

  private sma(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

  private stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1));
  }
}
