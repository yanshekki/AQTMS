// ── Error Boundary ──
// Catches unhandled React errors, displays fallback UI.

import React from 'react';
import { Alert, Button, Container } from '@mui/material';
import { withTranslation, WithTranslation } from 'react-i18next';

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends React.Component<
  { children: React.ReactNode } & WithTranslation,
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('error.somethingWentWrong')}
          </Alert>
          <pre style={{ color: '#9ca3af', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <Button
            variant="outlined"
            onClick={() => this.setState({ hasError: false, error: null })}
            sx={{ mt: 2 }}
          >
            {t('error.tryAgain')}
          </Button>
        </Container>
      );
    }
    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryClass) as React.ComponentType<{ children: React.ReactNode }>;
