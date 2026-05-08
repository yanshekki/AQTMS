// ── Exchange Connection Hook (Improved) ──
// Now supports returning the newly connected exchange ID for immediate testing in modal

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

  // Track the most recently connected exchange for immediate testing
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
      // Invalidate list so it refreshes
      void queryClient.invalidateQueries({ queryKey: ['exchanges'] });

      // Store the newly connected ID so Modal can show Test button immediately
      if (newExchange?.id) {
        setLastConnectedId(newExchange.id);
      }
    },
    onError: () => {
      // Clear lastConnectedId on failure
      setLastConnectedId(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: exchangeApi.testConnection,
  });

  // Improved connect function that returns the result (for better control)
  const connect = async (data: ConnectExchangeForm): Promise<ExchangeAccount | undefined> => {
    try {
      const result = await connectMutation.mutateAsync(data);
      return result;
    } catch (err) {
      // Error is already handled by mutation
      throw err;
    }
  };

  const resetLastConnected = () => {
    setLastConnectedId(null);
  };

  return {
    // Data
    exchanges: exchanges ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,

    // Last connected (for Modal immediate test flow)
    lastConnectedId,
    resetLastConnected,

    // Connect
    connect,                           // Now async and returns result
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error instanceof Error
      ? connectMutation.error.message
      : null,

    // Test connection
    testConnection: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
  };
}
