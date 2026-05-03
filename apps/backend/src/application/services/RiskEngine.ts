// ── Risk Engine ──
// Computes portfolio risk metrics: VaR, CVaR, max drawdown, concentration, correlation, beta.
// Uses historical simulation method for VaR/CVaR.



export interface PortfolioEntry {
  asset: string;
  quantity: number;
  currentPrice: number;
  historicalReturns: number[]; // Daily returns (decimal, e.g., 0.02 = 2%)
}

export interface RiskMetrics {
  portfolioValue: number;
  var95: number;          // Value at Risk (95% confidence, 1-day)
  var99: number;          // Value at Risk (99% confidence, 1-day)
  cvar95: number;         // Conditional VaR / Expected Shortfall
  maxDrawdown: number;    // Historical maximum drawdown (%)
  currentDrawdown: number;// Current drawdown from peak (%)
  sharpeRatio: number;    // Annualized Sharpe ratio
  concentration: ConcentrationRisk[];
  correlationMatrix: CorrelationEntry[];
  betaExposure: BetaExposure[];
  riskScore: number;      // 0-100 composite risk score
}

export interface ConcentrationRisk {
  asset: string;
  weight: number;         // % of portfolio
  exchangeConcentration?: number; // % on single exchange
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface CorrelationEntry {
  pair: string;        // e.g. "BTC-ETH"
  value: number;       // correlation coefficient (-1 to 1)
}

export interface BetaExposure {
  asset: string;
  betaVsBTC: number;
  betaVsETH: number;
  hedgeSuggestion?: string;
}

export interface RiskRules {
  maxLossPerTradePercent: number;
  maxDailyLossPercent: number;
  maxTotalExposurePercent: number;
  maxSingleAssetExposurePercent: number;
  forceCloseEnabled: boolean;
  maxDrawdownPercent: number;
  maxConcentrationPercent: number;
}

const DEFAULT_RULES: RiskRules = {
  maxLossPerTradePercent: 2,
  maxDailyLossPercent: 5,
  maxTotalExposurePercent: 80,
  maxSingleAssetExposurePercent: 25,
  forceCloseEnabled: true,
  maxDrawdownPercent: 20,
  maxConcentrationPercent: 30,
};

export class RiskEngine {
  private rules: RiskRules;

  constructor(rules?: Partial<RiskRules>) {
    this.rules = { ...DEFAULT_RULES, ...rules };
  }

  // ══════════════════════════════════════════════
  // Portfolio Risk Metrics
  // ══════════════════════════════════════════════

  computeMetrics(portfolio: PortfolioEntry[]): RiskMetrics {
    const portfolioValue = portfolio.reduce(
      (sum, p) => sum + p.quantity * p.currentPrice, 0,
    );

    // Aggregate portfolio daily returns (weighted by position value)
    const portfolioReturns = this.aggregateReturns(portfolio, portfolioValue);

    // VaR & CVaR (historical simulation)
    const { var95, var99, cvar95 } = this.computeVaR(portfolioReturns, portfolioValue);

    // Drawdown
    const { maxDrawdown, currentDrawdown } = this.computeDrawdown(portfolioReturns);

    // Sharpe Ratio
    const sharpeRatio = this.computeSharpe(portfolioReturns);

    // Concentration
    const concentration = this.computeConcentration(portfolio, portfolioValue);

    // Correlation
    const correlationMatrix = this.computeCorrelation(portfolio);

    // Beta
    const betaExposure = this.computeBeta(portfolio);

    // Risk score
    const riskScore = this.computeRiskScore(
      concentration, maxDrawdown, var95 / portfolioValue, sharpeRatio,
    );

    return {
      portfolioValue,
      var95: Math.abs(var95),
      var99: Math.abs(var99),
      cvar95: Math.abs(cvar95),
      maxDrawdown,
      currentDrawdown,
      sharpeRatio,
      concentration,
      correlationMatrix,
      betaExposure,
      riskScore,
    };
  }

  // ══════════════════════════════════════════════
  // VaR & CVaR — Historical Simulation
  // ══════════════════════════════════════════════

  private computeVaR(returns: number[], portfolioValue: number): {
    var95: number; var99: number; cvar95: number;
  } {
    if (returns.length < 30) {
      // Fallback: use simple volatility estimate
      const vol = this.standardDeviation(returns) * Math.sqrt(returns.length > 0 ? 252 / returns.length : 1);
      return {
        var95: portfolioValue * 1.645 * vol * (1 / Math.sqrt(252)),
        var99: portfolioValue * 2.33 * vol * (1 / Math.sqrt(252)),
        cvar95: portfolioValue * 2.06 * vol * (1 / Math.sqrt(252)),
      };
    }

    const sorted = [...returns].sort((a, b) => a - b);
    const index95 = Math.floor(sorted.length * 0.05);
    const index99 = Math.floor(sorted.length * 0.01);

    const var95 = sorted[index95]! * portfolioValue;
    const var99 = sorted[index99]! * portfolioValue;

    // CVaR: average of worst 5%
    const tail = sorted.slice(0, index95 + 1);
    const cvar95 = (tail.reduce((s, r) => s + r, 0) / tail.length) * portfolioValue;

    return { var95, var99, cvar95 };
  }

  // ══════════════════════════════════════════════
  // Drawdown
  // ══════════════════════════════════════════════

  computeDrawdown(returns: number[]): { maxDrawdown: number; currentDrawdown: number } {
    if (returns.length === 0) return { maxDrawdown: 0, currentDrawdown: 0 };

    let peak = 1;
    let maxDD = 0;
    let current = 1;

    for (const r of returns) {
      current *= (1 + r);
      if (current > peak) peak = current;
      const dd = (peak - current) / peak;
      if (dd > maxDD) maxDD = dd;
    }

    const currentDrawdown = peak > 0 ? (peak - current) / peak : 0;

    return {
      maxDrawdown: Math.round(maxDD * 10000) / 100, // percentage
      currentDrawdown: Math.round(currentDrawdown * 10000) / 100,
    };
  }

  // ══════════════════════════════════════════════
  // Sharpe Ratio (annualized)
  // ══════════════════════════════════════════════

  private computeSharpe(returns: number[]): number {
    if (returns.length < 2) return 0;
    const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const stdDev = this.standardDeviation(returns);
    if (stdDev === 0) return 0;
    // Annualized: daily mean * 252 / (daily std * sqrt(252))
    return (meanReturn * 252) / (stdDev * Math.sqrt(252));
  }

  // ══════════════════════════════════════════════
  // Concentration Risk
  // ══════════════════════════════════════════════

  private computeConcentration(
    portfolio: PortfolioEntry[],
    totalValue: number,
  ): ConcentrationRisk[] {
    if (totalValue === 0) return [];

    return portfolio.map((p) => {
      const weight = (p.quantity * p.currentPrice / totalValue) * 100;
      const threshold = this.rules.maxSingleAssetExposurePercent;
      let riskLevel: ConcentrationRisk['riskLevel'] = 'LOW';
      if (weight > threshold * 1.5) riskLevel = 'CRITICAL';
      else if (weight > threshold) riskLevel = 'HIGH';
      else if (weight > threshold * 0.7) riskLevel = 'MEDIUM';

      return { asset: p.asset, weight: Math.round(weight * 100) / 100, riskLevel };
    }).sort((a, b) => b.weight - a.weight);
  }

  // ══════════════════════════════════════════════
  // Correlation Matrix
  // ══════════════════════════════════════════════

  private computeCorrelation(portfolio: PortfolioEntry[]): CorrelationEntry[] {
    if (portfolio.length < 2) return [];

    const results: CorrelationEntry[] = new Array<CorrelationEntry>();
    for (let i = 0; i < portfolio.length; i++) {
      for (let j = i + 1; j < portfolio.length; j++) {
        const corr = this.pearsonCorrelation(
          portfolio[i]!.historicalReturns,
          portfolio[j]!.historicalReturns,
        );
        results.push({
          pair: `${portfolio[i]!.asset}-${portfolio[j]!.asset}`,
          value: Math.round(corr * 1000) / 1000,
        });
      }
    }
    return results;
  }

  // ══════════════════════════════════════════════
  // Beta Exposure
  // ══════════════════════════════════════════════

  private computeBeta(portfolio: PortfolioEntry[]): BetaExposure[] {
    const btc = portfolio.find((p) => p.asset === 'BTC');
    const eth = portfolio.find((p) => p.asset === 'ETH');

    return portfolio
      .filter((p) => p.asset !== 'BTC' && p.asset !== 'ETH')
      .map((p) => {
        const betaBTC = btc && btc.historicalReturns.length > 1
          ? this.computeSingleBeta(p.historicalReturns, btc.historicalReturns)
          : null;
        const betaETH = eth && eth.historicalReturns.length > 1
          ? this.computeSingleBeta(p.historicalReturns, eth.historicalReturns)
          : null;

        let hedgeSuggestion: string | undefined;
        if (betaBTC && betaBTC > 1.5) {
          hedgeSuggestion = `High BTC beta (${betaBTC.toFixed(2)}). Consider BTC short hedge.`;
        } else if (betaETH && betaETH > 1.5) {
          hedgeSuggestion = `High ETH beta (${betaETH.toFixed(2)}). Consider ETH short hedge.`;
        }

        return {
          asset: p.asset,
          betaVsBTC: betaBTC ?? 0,
          betaVsETH: betaETH ?? 0,
          ...(hedgeSuggestion ? { hedgeSuggestion } : {}),
        };
      });
  }

  // ══════════════════════════════════════════════
  // Risk Score (0-100)
  // ══════════════════════════════════════════════

  private computeRiskScore(
    concentration: ConcentrationRisk[],
    maxDrawdown: number,
    varRatio: number,
    sharpe: number,
  ): number {
    let score = 50;

    // Concentration penalty
    for (const c of concentration) {
      if (c.riskLevel === 'CRITICAL') score += 20;
      else if (c.riskLevel === 'HIGH') score += 10;
      else if (c.riskLevel === 'MEDIUM') score += 5;
    }

    // Drawdown penalty
    if (maxDrawdown > 30) score += 20;
    else if (maxDrawdown > 20) score += 12;
    else if (maxDrawdown > 10) score += 5;

    // VaR penalty
    if (varRatio > 0.05) score += 15;
    else if (varRatio > 0.03) score += 8;

    // Sharpe penalty (low Sharpe = higher risk)
    if (sharpe < 0) score += 10;
    else if (sharpe < 0.5) score += 5;
    else if (sharpe > 2) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  // ══════════════════════════════════════════════
  // Position Sizing — Kelly Criterion
  // ══════════════════════════════════════════════

  kellyCriterion(winRate: number, avgWin: number, avgLoss: number, fraction = 1): number {
    // f* = (p * b - q) / b  where b = avgWin/avgLoss
    if (avgLoss === 0) return 0;
    const b = Math.abs(avgWin / avgLoss);
    const q = 1 - winRate;
    const kelly = (winRate * b - q) / b;
    return Math.max(0, kelly * fraction);
  }

  // ══════════════════════════════════════════════
  // Risk Rule Evaluation
  // ══════════════════════════════════════════════

  evaluateTrade(
    trade: { symbol: string; quantity: number; price: number },
    portfolio: PortfolioEntry[],
    dailyPnL: number,
  ): { allowed: boolean; violations: string[]; suggestedSize?: number | undefined } {
    const violations: string[] = [];

    const portfolioValue = portfolio.reduce((s, p) => s + p.quantity * p.currentPrice, 0);
    const tradeValue = trade.quantity * trade.price;

    // Check single trade risk
    const tradeRiskPercent = (tradeValue / portfolioValue) * 100;
    if (tradeRiskPercent > this.rules.maxSingleAssetExposurePercent) {
      violations.push(
        `Trade exceeds single asset limit (${tradeRiskPercent.toFixed(1)}% > ${this.rules.maxSingleAssetExposurePercent}%)`,
      );
    }

    // Check total exposure
    const currentExposure = portfolio.reduce((s, p) => s + p.quantity * p.currentPrice, 0);
    const newExposure = ((currentExposure + tradeValue) / portfolioValue) * 100;
    if (newExposure > this.rules.maxTotalExposurePercent) {
      violations.push(
        `Total exposure would exceed limit (${newExposure.toFixed(1)}% > ${this.rules.maxTotalExposurePercent}%)`,
      );
    }

    // Check daily loss limit
    if (dailyPnL < -this.rules.maxDailyLossPercent * portfolioValue / 100) {
      violations.push(
        `Daily loss limit reached — trading blocked until next day`,
      );
    }

    return {
      allowed: violations.length === 0,
      violations,
      suggestedSize: tradeRiskPercent > this.rules.maxSingleAssetExposurePercent
        ? (this.rules.maxSingleAssetExposurePercent / 100 * portfolioValue) / trade.price
        : undefined,
    };
  }

  // ══════════════════════════════════════════════
  // Position Sizing Algorithms
  // ══════════════════════════════════════════════

  fixedFractional(accountSize: number, riskPercent: number, stopLossDistance: number): number {
    // Position size = (account * risk%) / stopLossDistance
    if (stopLossDistance <= 0) return 0;
    return (accountSize * (riskPercent / 100)) / stopLossDistance;
  }

  fixedRatio(delta: number, accountSize: number): number {
    // Fixed Ratio: number of units = 0.5 * (1 + sqrt(1 + 8 * accountSize / delta))
    if (delta <= 0) return 0;
    return 0.5 * (1 + Math.sqrt(1 + 8 * accountSize / delta));
  }

  atrAdjusted(accountSize: number, riskPercent: number, atr: number, price: number): number {
    if (atr <= 0 || price <= 0) return 0;
    const riskAmount = accountSize * (riskPercent / 100);
    const stopDistance = atr * 2; // 2x ATR stop
    return riskAmount / (stopDistance * (price / atr));
  }

  // ══════════════════════════════════════════════
  // Statistical Helpers
  // ══════════════════════════════════════════════

  private aggregateReturns(portfolio: PortfolioEntry[], totalValue: number): number[] {
    if (portfolio.length === 0 || totalValue === 0) return [];

    const maxLen = Math.max(...portfolio.map((p) => p.historicalReturns.length));
    if (maxLen === 0) return [];

    const aggregated: number[] = new Array(maxLen).fill(0) as number[];
    for (let i = 0; i < maxLen; i++) {
      let sum = 0;
      for (const p of portfolio) {
        const idx = p.historicalReturns.length - maxLen + i;
        const r = p.historicalReturns[idx];
        if (r !== undefined) {
          const weight = (p.quantity * p.currentPrice) / totalValue;
          sum += r * weight;
        }
      }
      aggregated[i] = sum;
    }
    return aggregated;
  }

  private standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;

    const xSlice = x.slice(-n);
    const ySlice = y.slice(-n);

    const meanX = xSlice.reduce((s, v) => s + v, 0) / n;
    const meanY = ySlice.reduce((s, v) => s + v, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = xSlice[i]! - meanX;
      const dy = ySlice[i]! - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
  }

  private computeSingleBeta(assetReturns: number[], benchmarkReturns: number[]): number {
    const n = Math.min(assetReturns.length, benchmarkReturns.length);
    if (n < 2) return 0;

    const aSlice = assetReturns.slice(-n);
    const bSlice = benchmarkReturns.slice(-n);
    const cov = this.covariance(aSlice, bSlice);
    const varB = this.variance(bSlice);
    return varB === 0 ? 0 : cov / varB;
  }

  private covariance(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    const meanX = x.slice(-n).reduce((s, v) => s + v, 0) / n;
    const meanY = y.slice(-n).reduce((s, v) => s + v, 0) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (x[x.length - n + i]! - meanX) * (y[y.length - n + i]! - meanY);
    }
    return sum / (n - 1);
  }

  private variance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  }
}
