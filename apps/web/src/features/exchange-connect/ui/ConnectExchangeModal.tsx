// ── Connect Exchange Modal ──

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Typography, Alert, CircularProgress, Box
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ConnectExchangeForm } from '../lib/schemas';

import type { ExchangeAccount } from '../lib/schemas';

interface ConnectExchangeModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (data: ConnectExchangeForm) => Promise<void>;
  isConnecting: boolean;
  connectError: string | null;
  testConnection: (exchangeId: string) => Promise<boolean>;
  newlyConnectedId: string | null;
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
    name: '',
    apiKey: '',
    apiSecret: '',
    testnet: true,
  });

  const [_testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleChange = (field: keyof ConnectExchangeForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      await onConnect(form);
    } catch (error) {
      // Error is handled by parent
    }
  };

  const handleTest = async () => {
    if (!newlyConnectedId) return;

    setTestingId(newlyConnectedId);
    setTestResult(null);

    try {
      const success = await testConnection(newlyConnectedId);
      setTestResult({
        success,
        message: success ? '連接測試成功！' : '連接測試失敗',
      });

      if (success && onTestSuccess) {
        onTestSuccess();
      }
    } catch {
      setTestResult({ success: false, message: '測試過程發生錯誤' });
    } finally {
      setTestingId(null);
    }
  };

  const handleClose = () => {
    setForm({
      exchange: 'BINANCE',
      name: '',
      apiKey: '',
      apiSecret: '',
      testnet: true,
    });
    setTestResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('exchanges.connectTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {connectError && <Alert severity="error">{connectError}</Alert>}

          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'}>
              {testResult.message}
            </Alert>
          )}

          <TextField
            select
            label="交易所"
            value={form.exchange}
            onChange={(e) => handleChange('exchange', e.target.value)}
            fullWidth
          >
            <MenuItem value="BINANCE">Binance</MenuItem>
            <MenuItem value="BYBIT">Bybit</MenuItem>
          </TextField>

          <TextField
            label="帳戶名稱 (自訂)"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            fullWidth
            placeholder="例如：我的 Binance 帳戶"
          />

          <TextField
            label="API Key"
            value={form.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            fullWidth
          />

          <TextField
            label="API Secret"
            type="password"
            value={form.apiSecret}
            onChange={(e) => handleChange('apiSecret', e.target.value)}
            fullWidth
          />

          <TextField
            select
            label="環境"
            value={form.testnet ? 'testnet' : 'mainnet'}
            onChange={(e) => handleChange('testnet', e.target.value === 'testnet')}
            fullWidth
          >
            <MenuItem value="testnet">Testnet（推薦先用這個測試）</MenuItem>
            <MenuItem value="mainnet">Mainnet（實盤）</MenuItem>
          </TextField>

          {newlyConnectedId && (
            <Box sx={{ pt: 1 }}>
              <Button
                variant="outlined"
                onClick={handleTest}
                disabled={!!_testingId}
                fullWidth
              >
                {_testingId ? '測試中...' : '測試連接'}
              </Button>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isConnecting || !form.apiKey || !form.apiSecret}
        >
          {isConnecting ? '連接中...' : '連接'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
