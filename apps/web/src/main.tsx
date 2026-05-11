// ── AQTMS Frontend Entry Point ──

import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { AppProviders } from './app';
import { AppRouter } from './app/AppRouter';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>,
);
