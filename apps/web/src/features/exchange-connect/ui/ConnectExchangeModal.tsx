// ── Connect Exchange Modal (Clean & Working) ──

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
  Typography,
  Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ConnectExchangeForm } from '../lib/schemas';

interface ConnectExchangeModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (data: ConnectExchangeForm) => Promise<void>;
  isConnecting: boolean;
  connectError: string | null;
}

export function ConnectExchangeModal({
  open,
  onClose,
  onConnect,
  isConnecting,
  connectError,
}: ConnectExchangeModalProps) {
  const { t } = useTranslation();

  const [form, setForm] = useState<ConnectExchangeForm>({
    exchange: 'BINANCE',
    name: '',
    apiKey: '',
    apiSecret: '',
    testnet: true,
  });

  const handleConnect = async () => {
    await onConnect(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('exchange.connectTitle', '連接交易所')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {connectError && <Alert severity="error">{connectError}</Alert>}

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
            label={t('exchange.name', '名稱')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
          />

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

          <TextField
            select
            label={t('exchange.environment', '環境')}
            value={form.testnet ? 'testnet' : 'mainnet'}
            onChange={(e) => setForm({ ...form, testnet: e.target.value === 'testnet' })}
            fullWidth
          >
            <MenuItem value="testnet">Testnet</MenuItem>
            <MenuItem value="mainnet">Mainnet</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isConnecting}>
          {t('common.cancel', '取消')}
        </Button>
        <Button
          variant="contained"
          onClick={handleConnect}
          disabled={isConnecting || !form.apiKey || !form.apiSecret}
        >
          {isConnecting ? t('common.connecting', '連接中...') : t('exchange.connect', '連接')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
