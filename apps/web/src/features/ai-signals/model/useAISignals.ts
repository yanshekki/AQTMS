// ── useAISignals Hook (React Query + 15s auto-refresh) ──

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '../api/signalsApi';
import type { SignalFilters } from '../lib/types';

export function useAISignals() {
  const [filters, setFilters] = useState<SignalFilters>({ limit: 50 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-signals', filters],
    queryFn: () => signalsApi.getRecentSignals(filters),
    refetchInterval: 15_000, // 15s auto-refresh
  });

  const updateFilters = useCallback((patch: Partial<SignalFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  return {
    signals: data?.data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    filters,
    setFilters: updateFilters,
  };
}
