// ── Exchange Connection Hook (React Query + Jotai) ──

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { exchangeApi } from '../api/exchangeApi';
import { isAuthenticatedAtom } from '@/store/auth';

export function useExchangeConnection() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const queryClient = useQueryClient();

  const { data: exchanges, isLoading, error } = useQuery({
    queryKey: ['exchanges'],
    queryFn: exchangeApi.getConnectedExchanges,
    enabled: isAuthenticated,
    refetchInterval: 60_000, // Auto-refresh every 60s
  });

  const connectMutation = useMutation({
    mutationFn: exchangeApi.connectExchange,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exchanges'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: exchangeApi.testConnection,
  });

  return {
    exchanges: exchanges ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error instanceof Error ? connectMutation.error.message : null,
    testConnection: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
  };
}
