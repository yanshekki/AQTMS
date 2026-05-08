// ── Place Order Modal (MVP) ──

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Typography, Alert
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
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof CreateTradeInput, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (!form.exchangeAccountId) {
      setError('Please select an exchange account');
      return;
    }
    if (!form.symbol || form.quantity <= 0) {
      setError('Symbol and quantity are required');
      return;
    }

    setLoading(true);
    try {
      await tradeApi.placeOrder(form);
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Reset form
        setForm({
          exchangeAccountId: exchangeAccounts[0]?.id || '',
          symbol: defaultSymbol,
          side: defaultSide,
          type: 'MARKET',
          quantity: 0,
          price: undefined,
          timeInForce: 'GTC',
        });
        setSuccess(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Place Order</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">Order placed successfully!</Alert>}

          <TextField
            select
            label="Exchange Account"
            value={form.exchangeAccountId}
            onChange={(e) => handleChange('exchangeAccountId', e.target.value)}
            fullWidth
          >
            {exchangeAccounts.map((acc) => (
              <MenuItem key={acc.id} value={acc.id}>
                {acc.exchange} - {acc.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Symbol (e.g. BTCUSDT)"
            value={form.symbol}
            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
            fullWidth
          />

          <TextField
            select
            label="Side"
            value={form.side}
            onChange={(e) => handleChange('side', e.target.value as 'BUY' | 'SELL')}
            fullWidth
          >
            <MenuItem value="BUY">BUY</MenuItem>
            <MenuItem value="SELL">SELL</MenuItem>
          </TextField>

          <TextField
            select
            label="Order Type"
            value={form.type}
            onChange={(e) => handleChange('type', e.target.value as 'MARKET' | 'LIMIT')}
            fullWidth
          >
            <MenuItem value="MARKET">MARKET</MenuItem>
            <MenuItem value="LIMIT">LIMIT</MenuItem>
          </TextField>

          <TextField
            label="Quantity"
            type="number"
            value={form.quantity || ''}
            onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
            fullWidth
          />

          {form.type === 'LIMIT' && (
            <TextField
              label="Price"
              type="number"
              value={form.price || ''}
              onChange={(e) => handleChange('price', parseFloat(e.target.value) || undefined)}
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || success}
        >
          {loading ? 'Placing Order...' : 'Place Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
