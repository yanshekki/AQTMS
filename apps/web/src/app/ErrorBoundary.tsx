// ── Error Boundary ──
// Catches unhandled React errors, displays fallback UI.

import React from 'react';
import { Alert, Button, Container } from '@mui/material';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Something went wrong
          </Alert>
          <pre style={{ color: '#9ca3af', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <Button
            variant="outlined"
            onClick={() => this.setState({ hasError: false, error: null })}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Container>
      );
    }
    return this.props.children;
  }
}
