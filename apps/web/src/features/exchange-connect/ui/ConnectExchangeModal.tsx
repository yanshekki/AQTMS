// ── Connect Exchange Modal (Improved) ──

import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { ApiKeyForm } from './ApiKeyForm';
import { ConnectionTestButton } from './ConnectionTestButton';
import { useThemeMode } from '@/app/Providers';
import type { ConnectExchangeForm } from '../lib/schemas';

interface ConnectExchangeModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (data: ConnectExchangeForm) => void;
  isConnecting: boolean;
  connectError: string | null;
  testConnection: (exchangeId: string) => Promise<boolean>;
  newlyConnectedId?: string | null;           // NEW: pass from parent after successful connect
  onTestSuccess?: () => void;                 // NEW: callback after successful test
}

export function ConnectExchangeModal({
  open,
  onClose,
  onConnect,
  isConnecting,
  connectError,
  testConnection,
  newlyConnectedId,
  onTestSuccess,
}: ConnectExchangeModalProps) {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const borderColor = isDark ? '#1f2937' : '#e2e8f0';

  const showTestSection = !!newlyConnectedId && !isConnecting;

  return (
    <Dialog
      open={open}
      onClose={isConnecting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDark ? '#111827' : '#ffffff',
          border: 1,
          borderColor,
          borderRadius: 3,
          backdropFilter: 'blur(20px)',
        },
      }}
    >
      <DialogTitle
        sx={{
          color: isDark ? '#f3f4f6' : '#0f172a',
          fontWeight: 700,
          borderBottom: 1,
          borderColor,
        }}
      >
        {t('exchanges.connectExchange')}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {connectError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {connectError.includes('invalid') || connectError.includes('permission')
              ? t('exchanges.apiKeyInvalid')
              : connectError}
          </Alert>
        )}

        {!showTestSection ? (
          <ApiKeyForm onSubmit={onConnect} disabled={isConnecting} />
        ) : (
          <Stack spacing={2} alignItems="center" py={2}>
            <CheckCircleIcon sx={{ fontSize: 48, color: '#22c55e' }} />
            <Typography variant="h6" sx={{ color: isDark ? '#f3f4f6' : '#0f172a' }}>
              {t('exchanges.connectionSuccess') || 'Exchange connected successfully!'}
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? '#9ca3af' : '#64748b', textAlign: 'center' }}>
              {t('exchanges.testConnectionHint') || 'Test the connection to verify your API keys are working.'}
            </Typography>

            <ConnectionTestButton
              onTest={async () => {
                if (newlyConnectedId) {
                  const success = await testConnection(newlyConnectedId);
                  if (success && onTestSuccess) onTestSuccess();
                }
              }}
              disabled={false}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, borderTop: 1, borderColor, pt: 2 }}>
        <Button
          onClick={onClose}
          disabled={isConnecting}
          sx={{ color: isDark ? '#6b7280' : '#94a3b8' }}
        >
          {showTestSection ? t('exchanges.close') : t('exchanges.cancel')}
        </Button>

        {!showTestSection && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // Trigger form submit
              const form = document.querySelector('form');
              form?.requestSubmit();
            }}
            disabled={isConnecting}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: 3,
              fontWeight: 700,
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
              },
            }}
          >
            {isConnecting ? t('exchanges.connecting') : t('exchanges.connect')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
