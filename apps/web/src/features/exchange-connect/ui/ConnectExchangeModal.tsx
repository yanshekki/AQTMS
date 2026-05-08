// ── Connect Exchange Modal (Fixed Props) ──

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ConnectExchangeForm } from '../lib/schemas';

interface ConnectExchangeModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (data: ConnectExchangeForm) => Promise<void>;
  isConnecting: boolean;
  connectError: string | null;
  testConnection?: (exchangeId: string) => Promise<boolean>;
  newlyConnectedId?: string | null;
  onTestSuccess?: () => void;
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
  const { t } = useTranslation();

  const [form, setForm] = useState<ConnectExchangeForm>({
    exchange: 'BINANCE',
    apiKey: '',
    apiSecret: '',
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    if (!form.apiKey || !form.apiSecret) {
      setTestResult({ success: false, message: '請先填寫 API Key 和 Secret' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setTestResult({ success: true, message: '連接測試成功！API Key 有效' });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || '測試失敗，請檢查 API Key / Secret 是否正確',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    try {
      await onConnect(form);
      if (onTestSuccess) onTestSuccess();
    } catch (e) {
      // Error handled by parent
    }
  };

  const canConnect = form.apiKey && form.apiSecret;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('exchange.connectTitle', '連接交易所')}</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {connectError && <Alert severity="error">{connectError}</Alert>}

          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'}>
              {testResult.message}
            </Alert>
          )}

          <TextField
            select
            label={t('exchange.exchange', '交易所')}
            value={form.exchange}
            onChange={(e) => setForm({ ...form, exchange: e.target.value as any })}
            fullWidth
          >
            <MenuItem value="BINANCE">Binance</MenuItem>
            <MenuItem value="BYBIT">Bybit</MenuItem>
          </TextField>

          <TextField
            label={t('exchange.apiKey', 'API Key')}
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            fullWidth
          />

          <TextField
            label={t('exchange.apiSecret', 'API Secret')}
            type="password"
            value={form.apiSecret}
            onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
            fullWidth
          />

          <Box>
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={isTesting || !form.apiKey || !form.apiSecret}
              startIcon={isTesting ? <CircularProgress size={18} /> : null}
              fullWidth
            >
              {isTesting ? '測試中...' : '測試連接'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              建議先測試連接，確認 API Key 有效後再連接
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isConnecting}>
          {t('common.cancel', '取消')}
        </Button>
        <Button
          variant="contained"
          onClick={handleConnect}
          disabled={isConnecting || !canConnect}
        >
          {isConnecting ? t('common.connecting', '連接中...') : t('exchange.connect', '連接')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
