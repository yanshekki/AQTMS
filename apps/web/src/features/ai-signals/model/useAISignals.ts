// ── useAISignals Hook (Improved Error Handling) ──

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '../api/signalsApi';
import type { SignalFilters } from '../lib/types';

export function useAISignals() {
  const [filters, setFilters] = useState<SignalFilters>({ limit: 50 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-signals', filters],
    queryFn: () => signalsApi.getRecentSignals(filters),
    refetchInterval: 15_000,
  });

  const updateFilters = useCallback((patch: Partial<SignalFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  // Convert technical error to user-friendly message
  const getFriendlyError = (err: any): string => {
    const message = err?.message || '';

    if (message.includes('network') || message.includes('fetch')) {
      return '無法載入 AI 訊號，請檢查網絡連接';
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return '登入已過期，請重新登入';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return '請求過於頻繁，請稍後再試';
    }

    return message || '載入 AI 訊號時發生錯誤';
  };

  return {
    signals: data?.data ?? [],
    isLoading,
    error: error ? getFriendlyError(error) : null,
    filters,
    setFilters: updateFilters,
  };
}
