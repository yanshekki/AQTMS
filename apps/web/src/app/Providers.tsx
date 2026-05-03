// ── App Providers with Theme Toggle ──

import React, { useState, useMemo, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme, lightTheme } from './theme';
import { ErrorBoundary } from './ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ mode: 'dark', toggle: () => {} });

export function useThemeMode() {
  return useContext(ThemeContext);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('aqtms_theme') as ThemeMode | null;
    return saved ?? 'dark';
  });

  const toggle = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('aqtms_theme', next);
      return next;
    });
  };

  const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ mode, toggle }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ErrorBoundary>{children}</ErrorBoundary>
        </ThemeProvider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
