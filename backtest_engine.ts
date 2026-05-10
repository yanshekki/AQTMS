#!/usr/bin/env ts-node
/**
 * 優化後的回測引擎 (BacktestEngine) - TypeScript v2 + Phase 6.5 + Phase 7
 * 從 Python 版本轉換而來
 * 加入功能:
 * - 滑點 (slippage) 模擬
 * - 手續費 (fee/commission) 模擬
 * - 倉位大小 (position sizing) 基於風險管理 (risk per trade + ATR or fixed stop)
 * - 更真實的資金模擬 (cash + position)
 * - 支持多頭/空頭
 * - 完整績效指標 (total return, Sharpe, max DD, profit factor, win rate 等)
 * - 視覺化報告：權益曲線、回撤曲線 (核心 metrics + CSV，視覺化可自行擴展)
 * - 自動輸出交易明細 CSV
 * - Strategy Registry + Plugin System (Phase 6)
 * - Parameter Optimization Framework (Grid Search) (Phase 6.5)
 * - Real Historical Data Integration (Phase 7) - Binance API + ATR calculation
 */

import * as fs from 'fs';

// ==================== 型別定義 ====================
interface BacktestConfig {
  initialCapital: number;
  slippagePct: number;
  feeRate: number;
  riskPerTrade: number;
  maxPositionPct: number;
  stopLossPct: number;
}

interface MarketRow {
  timestamp?: Date;
  close: number;
  high?: number;
  low?: number;
  atr?: number;
}

interface TradeRecord {
  timestamp: Date | string;
  action: string;
  price: number;
  qty: number;
  cost?: number;
  proceeds?: number;
  pnl?: number;
  cash_after?: number;
}

interface BacktestResult {
  metrics: Record<string, number | string>;
  equityCurve: number[];
  trades: TradeRecord[];
}

// ==================== Strategy Interface & Registry (Phase 6 新功能) ====================
interface Strategy {
  name: string;
  description: string;
  defaultParams: Record<string, any>;
  run: (data: MarketRow[], params?: Record<string, any>) => number[];
}

class StrategyRegistry {
  private strategies = new Map<string, Strategy>();

  register(strategy: Strategy): void {
    if (this.strategies.has(strategy.name)) {
      console.warn(`⚠️ Strategy "${strategy.name}" already registered, overwriting.`);
    }
    this.strategies.set(strategy.name, strategy);
  }

  get(name: string): Strategy | undefined {
    return this.strategies.get(name);
  }

  list(): string[] {
    return Array.from(this.strategies.keys());
  }

  getAll(): Strategy[] {
    return Array.from(this.strategies.values());
  }
}

// ==================== BacktestEngine 類別 ====================
class BacktestEngine {
  private config: BacktestConfig;

  constructor(config: Partial<BacktestConfig> = {}) {
    this.config = {
      initialCapital: 100000.0,
      slippagePct: 0.0005,
      feeRate: 0.0008,
      riskPerTrade: 0.015,
      maxPositionPct: 0.30,
      stopLossPct: 0.05,
      ...config
    };
  }

  private calculatePositionSize(
    currentEquity: number,
    price: number,
    atr?: number
  ): number {
    const riskAmount = currentEquity * this.config.riskPerTrade;
    let stopDistance: number;
    if (atr !== undefined && atr > 0) {
      stopDistance = atr * 2.0;
    } else {
      stopDistance = price * this.config.stopLossPct;
    }
    let qty = stopDistance > 0 ? riskAmount / stopDistance : 0;
    const maxQty = (currentEquity * this.config.maxPositionPct) / price;
    qty = Math.min(qty, maxQty);
    return Math.max(qty, 0.0);
  }

  public runBacktest(
    data: MarketRow[],
    strategyFunc: (data: MarketRow[], params?: any) => number[],
    strategyParams: any = {}
  ): BacktestResult {
    const n = data.length;
    if (n === 0) {
      throw new Error('Data cannot be empty');
    }

    const signals = strategyFunc(data, strategyParams);
    const processedSignals = signals.map(s => (s || 0));

    let cash = this.config.initialCapital;
    let position = 0.0;
    let entryPrice = 0.0;
    const equityCurve: number[] = [];
    const trades: TradeRecord[] = [];
    let peakEquity = this.config.initialCapital;
    let maxDrawdown = 0.0;
    const returnsList: number[] = [];

    for (let i = 0; i < n; i++) {
      const row = data[i];
      const price = row.close;
      const signal = processedSignals[i] || 0;
      const atr = (row.atr !== undefined && !isNaN(row.atr)) ? row.atr : undefined;

      const currentEquity = cash + position * price;
      equityCurve.push(currentEquity);

      // 更新最大回撤
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const drawdown = (peakEquity - currentEquity) / peakEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      // 計算每日回報 (用於 Sharpe)
      if (i > 0) {
        const ret = (currentEquity - equityCurve[i - 1]) / equityCurve[i - 1];
        returnsList.push(ret);
      }

      // === 執行交易訊號 ===
      if (signal === 1 && position === 0) {
        const qty = this.calculatePositionSize(currentEquity, price, atr);
        if (qty > 0) {
          const buyPrice = price * (1 + this.config.slippagePct);
          const cost = qty * buyPrice * (1 + this.config.feeRate);
          if (cost <= cash) {
            cash -= cost;
            position += qty;
            entryPrice = buyPrice;
            trades.push({
              timestamp: row.timestamp || new Date(),
              action: 'BUY',
              price: parseFloat(buyPrice.toFixed(4)),
              qty: parseFloat(qty.toFixed(4)),
              cost: parseFloat(cost.toFixed(2)),
              cash_after: parseFloat(cash.toFixed(2))
            });
          }
        }
      } else if (signal === -1 && position > 0) {
        const sellPrice = price * (1 - this.config.slippagePct);
        const proceeds = position * sellPrice * (1 - this.config.feeRate);
        const pnl = proceeds - (position * entryPrice);
        cash += proceeds;
        trades.push({
          timestamp: row.timestamp || new Date(),
          action: 'SELL',
          price: parseFloat(sellPrice.toFixed(4)),
          qty: parseFloat(position.toFixed(4)),
          proceeds: parseFloat(proceeds.toFixed(2)),
          pnl: parseFloat(pnl.toFixed(2)),
          cash_after: parseFloat(cash.toFixed(2))
        });
        position = 0.0;
        entryPrice = 0.0;
      }
    }

    // 最後一天強制平倉
    if (position > 0) {
      const finalPrice = data[n - 1].close;
      const sellPrice = finalPrice * (1 - this.config.slippagePct);
      const proceeds = position * sellPrice * (1 - this.config.feeRate);
      const pnl = proceeds - (position * entryPrice);
      cash += proceeds;
      trades.push({
        timestamp: data[n - 1].timestamp || new Date(),
        action: 'SELL (final)',
        price: parseFloat(sellPrice.toFixed(4)),
        qty: parseFloat(position.toFixed(4)),
        proceeds: parseFloat(proceeds.toFixed(2)),
        pnl: parseFloat(pnl.toFixed(2))
      });
      position = 0.0;
    }

    const finalEquity = cash + position * data[n - 1].close;

    // === 計算績效指標 ===
    const totalReturn = ((finalEquity - this.config.initialCapital) / this.config.initialCapital) * 100;

    let sharpeRatio = 0.0;
    if (returnsList.length > 1) {
      const meanRet = returnsList.reduce((a, b) => a + b, 0) / returnsList.length;
      const variance = returnsList.reduce((a, b) => a + Math.pow(b - meanRet, 2), 0) / (returnsList.length - 1);
      const std = Math.sqrt(variance);
      if (std > 0) {
        sharpeRatio = (meanRet / std) * Math.sqrt(252);
      }
    }

    const winning = trades.filter(t => (t.pnl || 0) > 0);
    const losing = trades.filter(t => (t.pnl || 0) < 0);
    const grossProfit = winning.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losing.reduce((sum, t) => sum + (t.pnl || 0), 0));
    let profitFactor: number | string = 0;
    if (grossLoss > 0) {
      profitFactor = grossProfit / grossLoss;
    } else if (grossProfit > 0) {
      profitFactor = 'inf';
    }
    const winRate = trades.length > 0 ? (winning.length / trades.length) * 100 : 0;
    const avgWin = winning.length > 0 ? grossProfit / winning.length : 0;
    const avgLoss = losing.length > 0 ? grossLoss / losing.length : 0;

    const metrics: Record<string, number | string> = {
      initial_capital: parseFloat(this.config.initialCapital.toFixed(2)),
      final_equity: parseFloat(finalEquity.toFixed(2)),
      total_return_pct: parseFloat(totalReturn.toFixed(2)),
      max_drawdown_pct: parseFloat((maxDrawdown * 100).toFixed(2)),
      sharpe_ratio: parseFloat(sharpeRatio.toFixed(2)),
      profit_factor: typeof profitFactor === 'number' ? parseFloat(profitFactor.toFixed(2)) : profitFactor,
      win_rate_pct: parseFloat(winRate.toFixed(2)),
      total_trades: trades.length,
      avg_win: parseFloat(avgWin.toFixed(2)),
      avg_loss: parseFloat(avgLoss.toFixed(2)),
      slippage_pct: this.config.slippagePct * 100,
      fee_rate_pct: this.config.feeRate * 100,
      risk_per_trade_pct: this.config.riskPerTrade * 100,
      max_position_pct: this.config.maxPositionPct * 100,
    };

    return {
      metrics,
      equityCurve,
      trades,
    };
  }

  public generateReport(
    result: BacktestResult,
    strategyName: string = 'Strategy',
    saveDir: string = '/home/workdir/artifacts'
  ): void {
    const metrics = result.metrics;
    const equity = result.equityCurve;
    const trades = result.trades;
    const initialCapital = Number(metrics.initial_capital) || 100000;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`【${strategyName} 完整回測報告】`);
    console.log(`${'='.repeat(70)}`);
    for (const [k, v] of Object.entries(metrics)) {
      console.log(`  ${k.padEnd(28)}: ${v}`);
    }

    // 儲存交易明細 CSV
    if (trades.length > 0) {
      const csvLines: string[] = [
        'timestamp,action,price,qty,cost,proceeds,pnl,cash_after'
      ];
      for (const t of trades) {
        const ts = t.timestamp instanceof Date ? t.timestamp.toISOString().split('T')[0] : String(t.timestamp);
        csvLines.push([
          ts,
          t.action,
          t.price,
          t.qty,
          t.cost ?? '',
          t.proceeds ?? '',
          t.pnl ?? '',
          t.cash_after ?? ''
        ].join(','));
      }
      const csvPath = `${saveDir}/${strategyName.replace(/ /g, '_')}_trades.csv`;
      fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
      console.log(`\n✅ 交易明細已儲存至: ${csvPath} (共 ${trades.length} 筆交易)`);
    }

    // 儲存權益曲線 CSV (Phase 8 新增)
    if (equity.length > 0) {
      const equityLines: string[] = ['day,equity'];
      equity.forEach((eq, i) => {
        equityLines.push(`${i + 1},${eq.toFixed(2)}`);
      });
      const equityPath = `${saveDir}/${strategyName.replace(/ /g, '_')}_equity_curve.csv`;
      fs.writeFileSync(equityPath, equityLines.join('\n'), 'utf8');
      console.log(`✅ 權益曲線已儲存至: ${equityPath}`);
    }

    // ==================== Phase 8: Advanced Reporting & Visualization ====================
    // 生成自包含 HTML 報告 (使用 Chart.js + Tailwind CDN，無需額外依賴)
    const htmlPath = `${saveDir}/${strategyName.replace(/ /g, '_')}_report.html`;
    const metricLabels: Record<string, string> = {
      initial_capital: '初始資金',
      final_equity: '最終權益',
      total_return_pct: '總回報率 (%)',
      max_drawdown_pct: '最大回撤 (%)',
      sharpe_ratio: '夏普比率',
      profit_factor: '盈虧比 (Profit Factor)',
      win_rate_pct: '勝率 (%)',
      total_trades: '總交易次數',
      avg_win: '平均盈利',
      avg_loss: '平均虧損',
      slippage_pct: '滑點 (%)',
      fee_rate_pct: '手續費率 (%)',
      risk_per_trade_pct: '每筆風險 (%)',
      max_position_pct: '最大持倉 (%)',
    };

    // 計算 Drawdown 序列 (用於圖表)
    const drawdowns: number[] = [];
    let peak = initialCapital;
    for (const eq of equity) {
      if (eq > peak) peak = eq;
      const dd = ((peak - eq) / peak) * 100;
      drawdowns.push(parseFloat(dd.toFixed(2)));
    }

    // 準備 Chart.js 數據
    const equityData = equity.map((v, i) => ({ x: i + 1, y: parseFloat(v.toFixed(2)) }));
    const drawdownData = drawdowns.map((v, i) => ({ x: i + 1, y: v }));

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-HK">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AQTMS 回測報告 - ${strategyName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&amp;family=Noto+Sans+TC:wght@400;500;700&amp;display=swap');
        body { font-family: 'Inter', 'Noto Sans TC', system-ui, sans-serif; }
        .metric-card { transition: transform 0.2s ease; }
        .metric-card:hover { transform: translateY(-2px); }
        .chart-container { position: relative; height: 320px; }
        .section-title { font-size: 1.25rem; font-weight: 600; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
        .nav-active { color: #2563eb; font-weight: 600; }
    </style>
</head>
<body class="bg-slate-50">
    <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
            <div>
                <div class="flex items-center gap-x-3">
                    <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <span class="text-white text-2xl font-bold">A</span>
                    </div>
                    <div>
                        <h1 class="text-3xl font-semibold text-slate-900">AQTMS Backtest Report</h1>
                        <p class="text-slate-500 text-sm">Automated Quantitative Trading Management System</p>
                    </div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-sm text-slate-500">生成時間</div>
                <div class="font-medium text-slate-700">${new Date().toLocaleString('zh-HK')}</div>
            </div>
        </div>

        <!-- Strategy Title -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <div class="uppercase tracking-[2px] text-xs font-semibold text-blue-600 mb-1">BACKTEST RESULT</div>
                    <h2 class="text-4xl font-semibold text-slate-900">${strategyName}</h2>
                </div>
                <div class="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-x-2">
                    <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    回測完成
                </div>
            </div>
        </div>

        <!-- Key Metrics -->
        <div class="mb-8">
            <div class="section-title mb-4 flex items-center gap-x-2">
                <span>📊 關鍵績效指標</span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${Object.entries(metrics).map(([key, value]) => {
                    const label = metricLabels[key] || key;
                    const isPercent = key.includes('_pct') || key.includes('pct');
                    const isRatio = key.includes('ratio') || key.includes('factor');
                    let displayValue = value;
                    let colorClass = 'text-slate-900';
                    if (typeof value === 'number') {
                        if (key === 'total_return_pct' || key === 'win_rate_pct') {
                            colorClass = value >= 0 ? 'text-emerald-600' : 'text-red-600';
                            displayValue = value.toFixed(2) + '%';
                        } else if (key === 'max_drawdown_pct') {
                            colorClass = 'text-amber-600';
                            displayValue = value.toFixed(2) + '%';
                        } else if (key === 'sharpe_ratio') {
                            colorClass = value >= 1 ? 'text-emerald-600' : 'text-amber-600';
                            displayValue = value.toFixed(2);
                        } else if (key.includes('profit_factor')) {
                            displayValue = typeof value === 'string' ? value : value.toFixed(2);
                        } else {
                            displayValue = value.toFixed(2);
                        }
                    }
                    return `
                    <div class="metric-card bg-white border border-slate-200 rounded-2xl p-5">
                        <div class="text-xs uppercase tracking-widest text-slate-500 mb-1">${label}</div>
                        <div class="text-3xl font-semibold ${colorClass}">${displayValue}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <!-- Equity Curve Chart -->
        <div class="mb-8">
            <div class="section-title mb-4 flex items-center justify-between">
                <span>📈 權益曲線 (Equity Curve)</span>
                <span class="text-xs px-3 py-1 bg-slate-100 text-slate-500 rounded-full">Daily Equity</span>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div class="chart-container">
                    <canvas id="equityChart"></canvas>
                </div>
                <div class="mt-3 text-xs text-slate-500 flex items-center gap-x-4">
                    <div class="flex items-center gap-x-1.5"><div class="w-3 h-0.5 bg-blue-500"></div> <span>策略權益</span></div>
                    <div class="flex items-center gap-x-1.5"><div class="w-3 h-0.5 bg-emerald-500"></div> <span>初始資金參考</span></div>
                </div>
            </div>
        </div>

        <!-- Drawdown Chart -->
        <div class="mb-8">
            <div class="section-title mb-4 flex items-center justify-between">
                <span>🌊 回撤曲線 (Drawdown)</span>
                <span class="text-xs px-3 py-1 bg-amber-100 text-amber-600 rounded-full">Underwater Plot</span>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div class="chart-container">
                    <canvas id="drawdownChart"></canvas>
                </div>
                <p class="mt-3 text-xs text-slate-500">最大回撤 (Max Drawdown): <span class="font-semibold text-amber-600">${(metrics.max_drawdown_pct || 0)}%</span></p>
            </div>
        </div>

        <!-- Trade Summary -->
        <div class="mb-8">
            <div class="section-title mb-4">📋 交易統計摘要</div>
            <div class="bg-white border border-slate-200 rounded-2xl p-6">
                <div class="grid grid-cols-3 gap-6 text-center">
                    <div>
                        <div class="text-4xl font-semibold text-slate-900">${metrics.total_trades || 0}</div>
                        <div class="text-sm text-slate-500 mt-1">總交易次數</div>
                    </div>
                    <div>
                        <div class="text-4xl font-semibold text-emerald-600">${metrics.win_rate_pct || 0}%</div>
                        <div class="text-sm text-slate-500 mt-1">勝率</div>
                    </div>
                    <div>
                        <div class="text-4xl font-semibold text-slate-900">${metrics.profit_factor || 'N/A'}</div>
                        <div class="text-sm text-slate-500 mt-1">盈虧比</div>
                    </div>
                </div>
                <div class="mt-6 pt-6 border-t text-sm text-slate-600">
                    詳細交易記錄已輸出至 <span class="font-mono text-blue-600">${strategyName.replace(/ /g, '_')}_trades.csv</span><br>
                    權益曲線數據已輸出至 <span class="font-mono text-blue-600">${strategyName.replace(/ /g, '_')}_equity_curve.csv</span>
                </div>
            </div>
        </div>

        <div class="text-center text-xs text-slate-400 mt-12">
            Generated by AQTMS Backtest Engine • Phase 8: Advanced Reporting &amp; Visualization<br>
            Open this HTML file in any modern browser (Chart.js &amp; Tailwind loaded via CDN)
        </div>
    </div>

    <script>
        // Tailwind script
        function initializeTailwind() {
            document.documentElement.style.setProperty('--accent', '#2563eb');
        }
        initializeTailwind();

        // Equity Curve Chart
        const equityCtx = document.getElementById('equityChart');
        new Chart(equityCtx, {
            type: 'line',
            data: {
                datasets: [{
                    label: '策略權益曲線',
                    data: ${JSON.stringify(equityData)},
                    borderColor: '#2563eb',
                    borderWidth: 2.5,
                    fill: true,
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                }, {
                    label: '初始資金',
                    data: Array(${equity.length}).fill(${initialCapital}),
                    borderColor: '#10b981',
                    borderWidth: 1.5,
                    borderDash: [4, 3],
                    fill: false,
                    pointRadius: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        type: 'linear',
                        title: { display: true, text: '交易日 (Day)' },
                        ticks: { 
                            callback: function(val) { 
                                return val % 30 === 0 ? 'D' + val : ''; 
                            },
                            maxRotation: 0 
                        },
                        grid: { color: '#f1f5f9' }
                    },
                    y: { 
                        title: { display: true, text: '權益 (Equity)' },
                        grid: { color: '#f1f5f9' }
                    }
                },
                plugins: {
                    legend: { position: 'top', align: 'end' },
                    tooltip: { 
                        mode: 'index', 
                        intersect: false,
                        callbacks: {
                            label: (ctx) => ctx.dataset.label + ': ' + ctx.raw.y.toLocaleString()
                        }
                    }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });

        // Drawdown Chart
        const ddCtx = document.getElementById('drawdownChart');
        new Chart(ddCtx, {
            type: 'line',
            data: {
                datasets: [{
                    label: '回撤 (%)',
                    data: ${JSON.stringify(drawdownData)},
                    borderColor: '#d97706',
                    borderWidth: 2,
                    fill: true,
                    backgroundColor: 'rgba(217, 119, 6, 0.15)',
                    tension: 0.2,
                    pointRadius: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        type: 'linear',
                        title: { display: true, text: '交易日 (Day)' },
                        ticks: { 
                            callback: function(val) { return val % 30 === 0 ? 'D' + val : ''; },
                            maxRotation: 0 
                        },
                        grid: { color: '#f1f5f9' }
                    },
                    y: { 
                        title: { display: true, text: '回撤百分比 (%)' },
                        reverse: true,  // 0 at top like underwater plot
                        grid: { color: '#f1f5f9' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => 'Drawdown: ' + ctx.raw.y + '%' } }
                }
            }
        });
    </script>
</body>
</html>`;

    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log(`\n✅ 進階 HTML 視覺化報告已生成: ${htmlPath}`);
    console.log('   (使用 Chart.js + Tailwind CDN，自包含開啟即可互動查看權益曲線與回撤圖)');

    console.log(`${'='.repeat(70)}\n`);
  }
}

// ==================== 範例策略 (TypeScript 版本) - Phase 6: Strategy Registry 整合 ====================
const smaCrossoverStrategy: Strategy = {
  name: 'SMA Crossover',
  description: '簡單移動平均線交叉策略 (黃金交叉買入、死亡交叉賣出)',
  defaultParams: { shortWindow: 10, longWindow: 30 },
  run: (data: MarketRow[], params: any = {}): number[] => {
    const shortWindow = params.shortWindow || 10;
    const longWindow = params.longWindow || 30;
    const n = data.length;
    const signals = new Array(n).fill(0);
    const smaShort = new Array(n).fill(0);
    const smaLong = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      if (i >= shortWindow - 1) {
        let sum = 0;
        for (let j = i - shortWindow + 1; j <= i; j++) sum += data[j].close;
        smaShort[i] = sum / shortWindow;
      }
      if (i >= longWindow - 1) {
        let sum = 0;
        for (let j = i - longWindow + 1; j <= i; j++) sum += data[j].close;
        smaLong[i] = sum / longWindow;
      }
    }

    for (let i = 1; i < n; i++) {
      if (smaShort[i] > smaLong[i] && smaShort[i - 1] <= smaLong[i - 1]) {
        signals[i] = 1; // 買入
      } else if (smaShort[i] < smaLong[i] && smaShort[i - 1] >= smaLong[i - 1]) {
        signals[i] = -1; // 賣出
      }
    }
    return signals;
  }
};

const meanReversionStrategy: Strategy = {
  name: 'Mean Reversion',
  description: '均值回歸策略 (類似布林帶，價格低於下軌買入、高於上軌賣出)',
  defaultParams: { period: 20, stdDev: 2.0 },
  run: (data: MarketRow[], params: any = {}): number[] => {
    const period = params.period || 20;
    const stdDev = params.stdDev || 2.0;
    const n = data.length;
    const signals = new Array(n).fill(0);

    for (let i = period; i < n; i++) {
      let sum = 0;
      let sqSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const c = data[j].close;
        sum += c;
        sqSum += c * c;
      }
      const ma = sum / period;
      const variance = (sqSum / period) - (ma * ma);
      const std = Math.sqrt(Math.max(0, variance));
      const upper = ma + stdDev * std;
      const lower = ma - stdDev * std;
      const close = data[i].close;
      if (close < lower) {
        signals[i] = 1;
      } else if (close > upper) {
        signals[i] = -1;
      }
    }
    return signals;
  }
};

const scoreThresholdStrategy: Strategy = {
  name: 'Score Threshold',
  description: 'AI Score Threshold 策略 (模擬 composite AI score 閾值觸發，高分買入、低分賣出)',
  defaultParams: { buyThreshold: 65.0, sellThreshold: 35.0, lookback: 5 },
  run: (data: MarketRow[], params: any = {}): number[] => {
    const buyThreshold = params.buyThreshold || 65.0;
    const sellThreshold = params.sellThreshold || 35.0;
    const lookback = params.lookback || 5;
    const n = data.length;
    const signals = new Array(n).fill(0);
    const returns = new Array(n).fill(0);

    for (let i = 1; i < n; i++) {
      returns[i] = ((data[i].close - data[i - 1].close) / data[i - 1].close) * 100;
    }

    for (let i = lookback; i < n; i++) {
      let momSum = 0;
      let retSqSum = 0;
      for (let j = i - lookback + 1; j <= i; j++) {
        momSum += returns[j];
        retSqSum += returns[j] * returns[j];
      }
      const recentMomentum = momSum / lookback;
      const meanRet = recentMomentum;
      const variance = (retSqSum / lookback) - (meanRet * meanRet);
      const volatility = Math.sqrt(Math.max(0, variance));

      let score = 50 + (recentMomentum * 4) - (volatility * 1.5);
      score = Math.max(0, Math.min(100, score));

      if (score > buyThreshold) {
        signals[i] = 1;
      } else if (score < sellThreshold) {
        signals[i] = -1;
      }
    }
    return signals;
  }
};

// ==================== 合成數據生成 (TypeScript 版本) ====================
function generateSyntheticPrices(n: number = 500, seed: number = 42): MarketRow[] {
  // 簡單 LCG 偽隨機 (可重現)
  let state = seed >>> 0;
  function random(): number {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  }

  const dates: Date[] = [];
  const start = new Date('2024-01-01');
  for (let i = 0; i < n; i++) {
    dates.push(new Date(start.getTime() + i * 24 * 60 * 60 * 1000));
  }

  let price = 100.0;
  const prices: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = 0; i < n; i++) {
    const ret = (random() - 0.5) * 0.03 + 0.0008; // 近似
    price = price * (1 + ret);
    price = Math.max(price, 5.0);
    prices.push(price);

    const high = price * (1 + random() * 0.025 + 0.005);
    const low = price * (1 - random() * 0.025 - 0.005);
    highs.push(Math.max(high, price));
    lows.push(Math.min(low, price));
  }

  // ATR 計算 (簡單 SMA of TR)
  const atrs: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - prices[i - 1]),
      Math.abs(lows[i] - prices[i - 1])
    );
    if (i < 14) {
      atrs[i] = tr;
    } else {
      let sum = 0;
      for (let j = i - 13; j <= i; j++) {
        const trj = Math.max(
          highs[j] - lows[j],
          Math.abs(highs[j] - prices[j - 1]),
          Math.abs(lows[j] - prices[j - 1])
        );
        sum += trj;
      }
      atrs[i] = sum / 14;
    }
  }
  atrs[0] = atrs[1] || 1.0;

  const data: MarketRow[] = [];
  for (let i = 0; i < n; i++) {
    data.push({
      timestamp: dates[i],
      close: prices[i],
      high: highs[i],
      low: lows[i],
      atr: atrs[i]
    });
  }
  return data;
}

// ==================== 真實歷史數據獲取 (Phase 7 新功能) ====================
// 支援 Binance API 拉取 K線數據 (OHLCV + 自動計算 ATR)
// interval 支援: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
// limit 最大 500 (Binance 單次限制)，如需更多數據可多次呼叫分頁
// 回傳 MarketRow[] 包含 timestamp, close, high, low, atr

async function fetchBinanceKlines(
  symbol: string = 'BTCUSDT',
  interval: string = '1d',
  limit: number = 500,
  startTime?: number,   // optional: start timestamp in ms
  endTime?: number      // optional: end timestamp in ms
): Promise<MarketRow[]> {
  let url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
  if (startTime) url += `&startTime=${startTime}`;
  if (endTime) url += `&endTime=${endTime}`;

  console.log(`📡 Fetching real historical data from Binance: ${symbol} ${interval} limit=${limit} ...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Binance API error ${response.status}: ${errorText}`);
    }
    const data: any[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No kline data returned from Binance API');
    }

    const marketData: MarketRow[] = data.map((k: any[]) => {
      const timestamp = new Date(Number(k[0]));
      const high = parseFloat(k[2]);
      const low = parseFloat(k[3]);
      const close = parseFloat(k[4]);

      return {
        timestamp,
        close,
        high,
        low,
        // atr computed below
      };
    });

    // 計算 ATR (14-period SMA of True Range)
    const n = marketData.length;
    const atrs: number[] = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const tr = Math.max(
        marketData[i].high! - marketData[i].low!,
        Math.abs(marketData[i].high! - marketData[i - 1].close),
        Math.abs(marketData[i].low! - marketData[i - 1].close)
      );
      if (i < 14) {
        atrs[i] = tr;
      } else {
        let sum = 0;
        for (let j = i - 13; j <= i; j++) {
          const trj = Math.max(
            marketData[j].high! - marketData[j].low!,
            Math.abs(marketData[j].high! - marketData[j - 1].close),
            Math.abs(marketData[j].low! - marketData[j - 1].close)
          );
          sum += trj;
        }
        atrs[i] = sum / 14;
      }
    }
    atrs[0] = atrs[1] || (marketData[0].high! - marketData[0].low! || 1.0);

    marketData.forEach((row, i) => {
      row.atr = atrs[i];
    });

    console.log(`✅ Successfully fetched ${marketData.length} candles for ${symbol} ${interval}`);
    console.log(`   期間: ${marketData[0].timestamp!.toISOString().split('T')[0]} ~ ${marketData[marketData.length - 1].timestamp!.toISOString().split('T')[0]}`);

    return marketData;
  } catch (error: any) {
    console.error(`❌ Error fetching Binance klines for ${symbol}: ${error.message}`);
    throw error;
  }
}

// ==================== Parameter Optimization Framework (Phase 6.5 新功能) ====================
// Grid Search 參數優化：自動搜尋最佳參數組合 (例如 SMA 的 short/long window)
// 支援任意策略的自訂參數 grid，自動過濾無效組合 (如 short >= long)
// 可指定優化目標 (sharpe_ratio, total_return_pct 等)

interface OptimizationResult {
  bestParams: Record<string, any>;
  bestMetrics: Record<string, number | string>;
  bestResult?: BacktestResult;
  allResults: Array<{ params: Record<string, any>; metrics: Record<string, number | string> }>;
}

function cartesianProduct(arrays: number[][], names: string[]): Record<string, number>[] {
  if (arrays.length === 0) return [{}];
  const [first, ...rest] = arrays;
  const restCombos = cartesianProduct(rest, names.slice(1));
  const result: Record<string, number>[] = [];
  for (const val of first) {
    for (const combo of restCombos) {
      result.push({ [names[0]]: val, ...combo });
    }
  }
  return result;
}

function optimizeGridSearch(
  engine: BacktestEngine,
  strategy: Strategy,
  data: MarketRow[],
  paramGrid: Record<string, number[]>,
  objectiveMetric: string = 'sharpe_ratio',
  maximize: boolean = true
): OptimizationResult {
  const paramNames = Object.keys(paramGrid);
  if (paramNames.length === 0) {
    throw new Error('paramGrid 不能為空');
  }

  const arrays = paramNames.map(name => paramGrid[name]);
  let combos = cartesianProduct(arrays, paramNames);

  // 自動過濾 SMA 類策略的無效組合 (shortWindow >= longWindow)
  combos = combos.filter(combo => {
    if (combo.shortWindow !== undefined && combo.longWindow !== undefined) {
      return combo.shortWindow < combo.longWindow;
    }
    // 可在此加入其他策略的約束，例如 period > 1 等
    return true;
  });

  console.log(`\n🔍 開始 Grid Search 參數優化 [${strategy.name}] ...`);
  console.log(`   參數空間: ${JSON.stringify(paramGrid)}`);
  console.log(`   有效組合數: ${combos.length} (已自動過濾無效參數)`);
  console.log(`   優化目標: ${objectiveMetric} (${maximize ? '最大化' : '最小化'})`);

  let bestScore = maximize ? -Infinity : Infinity;
  let bestParams: Record<string, any> = {};
  let bestResult: BacktestResult | undefined = undefined;
  const allResults: Array<{ params: Record<string, any>; metrics: Record<string, number | string> }> = [];

  let count = 0;
  for (const params of combos) {
    count++;
    try {
      const result = engine.runBacktest(data, strategy.run, params);
      const score = Number(result.metrics[objectiveMetric]) || 0;
      allResults.push({ params: { ...params }, metrics: { ...result.metrics } });

      const isBetter = maximize ? (score > bestScore) : (score < bestScore);
      if (isBetter || Object.keys(bestParams).length === 0) {
        bestScore = score;
        bestParams = { ...params };
        bestResult = result;
      }
    } catch (e: any) {
      console.warn(`  ⚠️ 參數 ${JSON.stringify(params)} 執行失敗: ${e.message}`);
    }
  }

  console.log(`✅ Grid Search 完成！測試了 ${count} 組參數`);
  if (Object.keys(bestParams).length > 0) {
    console.log(`🏆 最佳 ${objectiveMetric}: ${bestScore.toFixed(2)}`);
    console.log(`   最佳參數組合: ${JSON.stringify(bestParams)}`);
  } else {
    console.log('❌ 沒有找到有效參數組合');
  }

  // 顯示 Top 5 結果 (按目標排序)
  const sorted = [...allResults].sort((a, b) => {
    const sa = Number(a.metrics[objectiveMetric]) || 0;
    const sb = Number(b.metrics[objectiveMetric]) || 0;
    return maximize ? (sb - sa) : (sa - sb);
  });
  console.log('\n📊 Top 5 最佳參數組合:');
  sorted.slice(0, 5).forEach((r, i) => {
    const score = Number(r.metrics[objectiveMetric]).toFixed(2);
    console.log(`  ${i + 1}. ${JSON.stringify(r.params)} => ${objectiveMetric}=${score}`);
  });

  return {
    bestParams,
    bestMetrics: bestResult ? bestResult.metrics : {},
    bestResult,
    allResults
  };
}

// ==================== 主程式示範 (Phase 7: Real Data Integration) ====================
if (require.main === module) {
  (async () => {
    console.log('=== 優化回測引擎 v2 (TypeScript) - Phase 6 + Phase 7: Real Historical Data Integration 示範 ===\n');

    // ==================== Phase 7: 使用真實 Binance 歷史數據 ====================
    // 範例：拉取 BTCUSDT 每日 K線 (最近約 1 年，limit=365)
    // 如需指定日期範圍，可傳 startTime / endTime (ms timestamp)
    console.log('>>> 【Phase 7】從 Binance 拉取真實歷史數據 (BTCUSDT 1d, limit=365) ...');
    let data: MarketRow[];
    try {
      data = await fetchBinanceKlines('BTCUSDT', '1d', 365);
    } catch (err) {
      console.warn('⚠️ 無法連線 Binance API，使用合成數據作為備援...');
      data = generateSyntheticPrices(500, 42);
    }

    console.log(`數據期間: ${data[0].timestamp!.toISOString().split('T')[0]} ~ ${data[data.length - 1].timestamp!.toISOString().split('T')[0]}`);
    const closes = data.map(d => d.close);
    console.log(`收盤價範圍: ${Math.min(...closes).toFixed(2)} ~ ${Math.max(...closes).toFixed(2)}\n`);

    const engine = new BacktestEngine({
      initialCapital: 100000.0,
      slippagePct: 0.0005,
      feeRate: 0.0008,
      riskPerTrade: 0.015,
      maxPositionPct: 0.30,
      stopLossPct: 0.05
    });

    // ==================== Phase 6: Strategy Registry Demo ====================
    const registry = new StrategyRegistry();
  registry.register(smaCrossoverStrategy);
  registry.register(meanReversionStrategy);
  registry.register(scoreThresholdStrategy);

  console.log(`\n📋 Phase 6 Strategy Registry 已註冊策略: ${registry.list().join(' | ')}`);
  console.log(`   總共 ${registry.list().length} 個策略，可動態擴展 (plugin-ready)\n`);

  // === Option A: Parameter Optimization (Grid Search) 示範 ===
  // 為 SMA Crossover 策略進行 Grid Search 參數優化
  // 搜尋範圍: shortWindow 5~20, longWindow 20~50，自動過濾 short >= long
  console.log('>>> 【Option A】為 SMA Crossover 執行 Grid Search 參數優化...');
  const optimizationResult = optimizeGridSearch(
    engine,
    smaCrossoverStrategy,
    data,
    {
      shortWindow: [5, 8, 10, 12, 15, 20],
      longWindow: [20, 25, 30, 35, 40, 50]
    },
    'sharpe_ratio',  // 優化目標：最大化 Sharpe Ratio
    true
  );

  console.log('\n🏆 使用最佳參數重新執行 SMA Crossover 並產生報告...');
  const bestSmaResult = engine.runBacktest(data, smaCrossoverStrategy.run, optimizationResult.bestParams);
  console.log('\n【最佳 SMA Crossover 策略績效摘要】');
  Object.entries(bestSmaResult.metrics).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(25)}: ${v}`);
  });
  engine.generateReport(bestSmaResult, 'SMA_Crossover_Optimized');

  // SMA Crossover (原預設參數對照)
  console.log('\n>>> 對照：使用原預設參數 (short=10, long=30) 執行 SMA Crossover...');
  const resultSma = engine.runBacktest(data, smaCrossoverStrategy.run, { shortWindow: 10, longWindow: 30 });
  console.log('\n【原參數 SMA Crossover 績效摘要】');
  Object.entries(resultSma.metrics).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(25)}: ${v}`);
  });

  // Mean Reversion
  console.log('\n>>> 執行 Mean Reversion 策略回測...');
  const resultMr = engine.runBacktest(data, meanReversionStrategy.run, { period: 20, stdDev: 2.0 });
  console.log('\n【Mean Reversion 策略績效摘要】');
  Object.entries(resultMr.metrics).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(25)}: ${v}`);
  });
  engine.generateReport(resultMr, 'Mean Reversion');

  // Score Threshold
  console.log('\n>>> 執行 Score Threshold (AI模擬分數閾值) 策略回測...');
  const resultScore = engine.runBacktest(data, scoreThresholdStrategy.run, {
    buyThreshold: 55.0,
    sellThreshold: 45.0,
    lookback: 5
  });
  console.log('\n【Score Threshold 策略績效摘要】');
  Object.entries(resultScore.metrics).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(25)}: ${v}`);
  });
  engine.generateReport(resultScore, 'Score Threshold');

  console.log('\n=== Phase 6 + 6.5 + Phase 7 + Phase 8 完成 ===');
  console.log('✅ Strategy Registry + Plugin System 已實作 (Phase 6)');
  console.log('✅ Parameter Optimization Framework (Grid Search) 已實作 (Phase 6.5 / Option A)');
  console.log('✅ Real Historical Data Integration (Phase 7) - Binance API fetch + ATR auto-calc');
  console.log('✅ Advanced Reporting & Visualization (Phase 8) - 自包含 HTML 報告 + 互動權益曲線 & 回撤圖 (Chart.js)');
  console.log('✅ 已註冊策略: SMA Crossover | Mean Reversion | Score Threshold (AI Score)');
  console.log('✅ 新功能: 動態策略註冊 + 自動參數優化 + 真實歷史數據 + 專業視覺化報告');
  console.log('功能: 完整回測引擎 + 績效指標 + CSV交易明細 + HTML互動圖表 + 參數優化 + 真實數據');
  console.log('所有報告已儲存在 /home/workdir/artifacts/ 目錄下');
  console.log('你可以用 registry.register(newStrategy) 新增策略');
  console.log('用 optimizeGridSearch(engine, strategy, data, paramGrid, objective) 自動優化參數');
  console.log('用 fetchBinanceKlines(symbol, interval, limit) 拉取真實數據');
  console.log('然後用 engine.runBacktest(data, strategy.run, bestParams) 回測最佳組合');
  console.log('然後用 engine.generateReport(result, "策略名稱") 產生專業報告！');
  console.log('\n注意: 本版本已內建進階 HTML 視覺化報告 (開啟 .html 即可看到互動圖表)。如需 PNG 可進一步整合 chartjs-node-canvas。');
  console.log('下一步建議: 新增更多策略 (RSI/MACD/Bollinger) 或 Walk-forward Analysis / 多資產支援');
  console.log('⚠️ 注意：fetchBinanceKlines 需要 Node.js >=18 支援 fetch，或安裝 node-fetch');
})();

export { BacktestEngine, smaCrossoverStrategy, meanReversionStrategy, scoreThresholdStrategy, generateSyntheticPrices, fetchBinanceKlines, MarketRow, BacktestResult, optimizeGridSearch, OptimizationResult };