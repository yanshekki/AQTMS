// ── Position Sizing Calculator ──
// Standalone utility for all position sizing algorithms.

import { RiskEngine } from './RiskEngine';

export type SizingMethod = 'KELLY_FULL' | 'KELLY_HALF' | 'FIXED_FRACTIONAL' | 'FIXED_RATIO' | 'ATR_ADJUSTED';

export interface SizingParams {
  method: SizingMethod;
  accountSize: number;
  riskPercent: number;
  winRate?: number;
  avgWin?: number;
  avgLoss?: number;
  stopLossDistance?: number;
  delta?: number;
  atr?: number;
  currentPrice: number;
}

export interface SizingResult {
  method: SizingMethod;
  suggestedSize: number;       // Number of units/contracts
  suggestedNotional: number;   // Suggested position value
  riskAmount: number;
  utilization: number;         // % of account
  formula: string;
}

export class PositionSizingCalculator {
  private riskEngine: RiskEngine;

  constructor(riskEngine: RiskEngine) {
    this.riskEngine = riskEngine;
  }

  calculate(params: SizingParams): SizingResult {
    const { method, accountSize, riskPercent, currentPrice } = params;
    let suggestedSize = 0;

    switch (method) {
      case 'KELLY_FULL': {
        if (!params.winRate || !params.avgWin || !params.avgLoss) {
          throw new Error('Kelly requires winRate, avgWin, avgLoss');
        }
        const kelly = this.riskEngine.kellyCriterion(params.winRate, params.avgWin, params.avgLoss, 1);
        suggestedSize = (accountSize * kelly) / currentPrice;
        break;
      }
      case 'KELLY_HALF': {
        if (!params.winRate || !params.avgWin || !params.avgLoss) {
          throw new Error('Kelly requires winRate, avgWin, avgLoss');
        }
        const kelly = this.riskEngine.kellyCriterion(params.winRate, params.avgWin, params.avgLoss, 0.5);
        suggestedSize = (accountSize * kelly) / currentPrice;
        break;
      }
      case 'FIXED_FRACTIONAL': {
        suggestedSize = this.riskEngine.fixedFractional(
          accountSize, riskPercent, params.stopLossDistance ?? currentPrice * 0.02,
        );
        break;
      }
      case 'FIXED_RATIO': {
        suggestedSize = this.riskEngine.fixedRatio(params.delta ?? 1000, accountSize);
        break;
      }
      case 'ATR_ADJUSTED': {
        suggestedSize = this.riskEngine.atrAdjusted(
          accountSize, riskPercent, params.atr ?? currentPrice * 0.02, currentPrice,
        );
        break;
      }
    }

    const suggestedNotional = suggestedSize * currentPrice;
    const riskAmount = accountSize * (riskPercent / 100);
    const utilization = (suggestedNotional / accountSize) * 100;

    const formulaDescriptions: Record<SizingMethod, string> = {
      KELLY_FULL: `f* = (p*b - q)/b, size = account * f* / price`,
      KELLY_HALF: `Half Kelly: f* = (p*b - q)/b * 0.5, size = account * f* / price`,
      FIXED_FRACTIONAL: `Risk ${riskPercent}% of account per trade`,
      FIXED_RATIO: `Units = 0.5 * (1 + sqrt(1 + 8 * account / delta))`,
      ATR_ADJUSTED: `Stop = 2x ATR, size = (account * risk%) / (stop * price/ATR)`,
    };

    return {
      method,
      suggestedSize: Math.round(suggestedSize * 1e8) / 1e8,
      suggestedNotional: Math.round(suggestedNotional * 100) / 100,
      riskAmount: Math.round(riskAmount * 100) / 100,
      utilization: Math.round(utilization * 100) / 100,
      formula: formulaDescriptions[method],
    };
  }

  compareAll(params: Omit<SizingParams, 'method'>): SizingResult[] {
    const methods: SizingMethod[] = ['KELLY_HALF', 'FIXED_FRACTIONAL', 'FIXED_RATIO', 'ATR_ADJUSTED'];
    return methods.map((method) => this.calculate({ ...params, method }));
  }
}
