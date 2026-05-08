// ── Exchange Connection Hook (Improved) ──

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

  // NEW: Delete exchange mutation
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
    } catch (err) {
      throw err;
    }
  };

  // NEW: delete function
  const deleteExchange = async (exchangeId: string) => {
    await deleteMutation.mutateAsync(exchangeId);
  };

  const resetLastConnected = () => {
    setLastConnectedId(null);
  };

  return {
    exchanges: exchanges ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,

    lastConnectedId,
    resetLastConnected,

    connect,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error instanceof Error ? connectMutation.error.message : null,

    // NEW
    deleteExchange,
    isDeleting: deleteMutation.isPending,

    testConnection: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
  };
}
