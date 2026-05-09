import { useState, useCallback, useEffect } from 'react';
import { portfolioApi } from '@/shared/api/portfolioApi';

export interface PortfolioSummaryData {
  totalValue: number;
  totalUnrealizedPnl: number;
  totalRiskExposure: number;
  positionCount: number;
}

export interface Position {
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  isPaper: boolean;
}

export function usePortfolio(autoRefreshInterval = 20000) {
  const [summary, setSummary] = useState<PortfolioSummaryData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPortfolio = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [summaryRes, positionsRes] = await Promise.all([
        portfolioApi.getSummary(),
        portfolioApi.getPositions(),
      ]);

      setSummary(summaryRes.data);
      setPositions(positionsRes.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to fetch portfolio', err);
      setError(err?.message || 'Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 自動刷新
  useEffect(() => {
    fetchPortfolio(); // 初始載入

    const interval = setInterval(() => {
      fetchPortfolio();
    }, autoRefreshInterval);

    return () => clearInterval(interval); // 清理
  }, [fetchPortfolio, autoRefreshInterval]);

  const refresh = useCallback(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return {
    summary,
    positions,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}
