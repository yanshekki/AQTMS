// ── AQTMS Frontend Entry Point ──

import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { AppProviders } from './app';
import { AppRouter } from './app/AppRouter';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>,
);
