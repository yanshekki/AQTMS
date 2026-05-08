// ── Place Order Modal (Further Improved) ──

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Alert, CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { tradeApi, type CreateTradeInput } from '../api/tradeApi';
import type { ExchangeAccount } from '@/features/exchange-connect/lib/schemas';

interface PlaceOrderModalProps {
  open: boolean;
  onClose: () => void;
  exchangeAccounts: ExchangeAccount[];
  defaultSymbol?: string;
  defaultSide?: 'BUY' | 'SELL';
  onSuccess?: () => void;
}

export function PlaceOrderModal({
  open,
  onClose,
  exchangeAccounts,
  defaultSymbol = '',
  defaultSide = 'BUY',
  onSuccess,
}: PlaceOrderModalProps) {
  const { t } = useTranslation();

  const [form, setForm] = useState<CreateTradeInput>({
    exchangeAccountId: exchangeAccounts[0]?.id || '',
    symbol: defaultSymbol,
    side: defaultSide,
    type: 'MARKET',
    quantity: 0,
    price: undefined,
    timeInForce: 'GTC',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (field: keyof CreateTradeInput, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = (): string | null => {
    if (!form.exchangeAccountId) return '請選擇交易所帳戶';
    if (!form.symbol || form.symbol.length < 4) return '請輸入正確的交易對（例如 BTCUSDT）';
    if (!form.quantity || form.quantity <= 0) return '數量必須大於 0';
    if (form.type === 'LIMIT' && (!form.price || form.price <= 0)) {
      return '限價單必須輸入有效的價格';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const result = await tradeApi.placeOrder(form);
      setSuccessMessage(`訂單提交成功！交易所訂單號: ${result.exchangeOrderId}`);

      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1600);
    } catch (err: any) {
      const rawMessage = err?.message || '';
      let friendlyMessage = '下單失敗，請稍後再試';

      // Map common backend errors to user-friendly messages
      if (rawMessage.includes('Insufficient balance') || rawMessage.includes('balance')) {
        friendlyMessage = '帳戶餘額不足，請先充值或減少下單數量';
      } else if (rawMessage.includes('Invalid quantity') || rawMessage.includes('quantity')) {
        friendlyMessage = '下單數量無效，請輸入正確數量';
      } else if (rawMessage.includes('Price too high') || rawMessage.includes('Price too low')) {
        friendlyMessage = '價格超出交易所允許範圍';
      } else if (rawMessage.includes('Invalid symbol') || rawMessage.includes('symbol')) {
        friendlyMessage = '交易對不存在或不支援';
      } else if (rawMessage.includes('API key') || rawMessage.includes('permission')) {
        friendlyMessage = '交易所 API 權限不足或 Key 錯誤';
      } else if (rawMessage) {
        friendlyMessage = rawMessage;
      }

      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      exchangeAccountId: exchangeAccounts[0]?.id || '',
      symbol: defaultSymbol,
      side: defaultSide,
      type: 'MARKET',
      quantity: 0,
      price: undefined,
      timeInForce: 'GTC',
    });
    setError(null);
    setSuccessMessage(null);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>手動下單</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          {successMessage && <Alert severity="success">{successMessage}</Alert>}

          <TextField
            select
            label="交易所帳戶"
            value={form.exchangeAccountId}
            onChange={(e) => handleChange('exchangeAccountId', e.target.value)}
            fullWidth
            disabled={loading}
          >
            {exchangeAccounts.map((acc) => (
              <MenuItem key={acc.id} value={acc.id}>
                {acc.exchange} — {acc.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="交易對 (Symbol)"
            placeholder="例如：BTCUSDT 或 ETHUSDT"
            value={form.symbol}
            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
            fullWidth
            disabled={loading}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="方向"
              value={form.side}
              onChange={(e) => handleChange('side', e.target.value as 'BUY' | 'SELL')}
              sx={{ flex: 1 }}
              disabled={loading}
            >
              <MenuItem value="BUY">BUY（買入）</MenuItem>
              <MenuItem value="SELL">SELL（賣出）</MenuItem>
            </TextField>

            <TextField
              select
              label="訂單類型"
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value as 'MARKET' | 'LIMIT')}
              sx={{ flex: 1 }}
              disabled={loading}
            >
              <MenuItem value="MARKET">市價單</MenuItem>
              <MenuItem value="LIMIT">限價單</MenuItem>
            </TextField>
          </Stack>

          <TextField
            label="數量"
            type="number"
            value={form.quantity || ''}
            onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
            fullWidth
            disabled={loading}
            inputProps={{ step: 'any' }}
          />

          {form.type === 'LIMIT' && (
            <TextField
              label="價格"
              type="number"
              value={form.price || ''}
              onChange={(e) => handleChange('price', parseFloat(e.target.value) || undefined)}
              fullWidth
              disabled={loading}
              inputProps={{ step: 'any' }}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !!successMessage}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {loading ? '提交中...' : '確認下單'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
