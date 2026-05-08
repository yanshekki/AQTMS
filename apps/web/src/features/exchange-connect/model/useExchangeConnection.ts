// ── Exchange Connection Hook (Improved Error Handling) ──

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { exchangeApi } from '../api/exchangeApi';
import { isAuthenticatedAtom } from '@/store/auth';
import type { ConnectExchangeForm } from '../lib/schemas';
import type { ExchangeAccount } from '../lib/schemas';

export function useExchangeConnection() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const queryClient = useQueryClient();

  const [lastConnectedId, setLastConnectedId] = useState<string | null>(null);

  const { data: exchanges, isLoading, error } = useQuery({
    queryKey: ['exchanges'],
    queryFn: exchangeApi.getConnectedExchanges,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  const connectMutation = useMutation({
    mutationFn: exchangeApi.connectExchange,
    onSuccess: (newExchange: ExchangeAccount) => {
      void queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      if (newExchange?.id) {
        setLastConnectedId(newExchange.id);
      }
    },
    onError: () => {
      setLastConnectedId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: exchangeApi.deleteExchange,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exchanges'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: exchangeApi.testConnection,
  });

  const connect = async (data: ConnectExchangeForm): Promise<ExchangeAccount | undefined> => {
    try {
      const result = await connectMutation.mutateAsync(data);
      return result;
    } catch (err: any) {
      // Convert technical error to user-friendly message
      throw new Error(getFriendlyErrorMessage(err));
    }
  };

  const deleteExchange = async (exchangeId: string) => {
    await deleteMutation.mutateAsync(exchangeId);
  };

  const resetLastConnected = () => {
    setLastConnectedId(null);
  };

  return {
    exchanges: exchanges ?? [],
    isLoading,
    error: error instanceof Error ? getFriendlyErrorMessage(error) : null,

    lastConnectedId,
    resetLastConnected,

    connect,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error instanceof Error 
      ? getFriendlyErrorMessage(connectMutation.error) 
      : null,

    deleteExchange,
    isDeleting: deleteMutation.isPending,

    testConnection: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
  };
}

// Helper function to convert technical errors to user-friendly messages
function getFriendlyErrorMessage(error: any): string {
  const message = error?.message || '';

  if (message.includes('invalid') || message.includes('API key')) {
    return 'API Key 或 Secret 不正確，請檢查後再試';
  }
  if (message.includes('permission') || message.includes('Unauthorized')) {
    return 'API Key 權限不足，請確保已開啟交易權限';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return '網絡連接失敗，請檢查網絡或稍後再試';
  }
  if (message.includes('already exists') || message.includes('duplicate')) {
    return '該交易所帳戶已經連接過了';
  }
  if (message.includes('testnet')) {
    return 'Testnet 連接失敗，請確認使用正確的 Testnet API Key';
  }

  // Default fallback
  return message || '發生未知錯誤，請稍後再試';
}
