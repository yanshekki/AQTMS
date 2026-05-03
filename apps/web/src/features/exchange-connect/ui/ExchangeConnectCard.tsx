// ── Exchange Connect UI ──

import React from 'react';
import { Button, Card, CardContent, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Stack, Chip } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const EXCHANGES = [
  { value: 'BINANCE', label: 'Binance' },
  { value: 'BYBIT', label: 'Bybit' },
  { value: 'FUTU', label: 'Futu (Phase 3)' },
  { value: 'IBKR', label: 'IBKR (Phase 3)' },
] as const;

export function ExchangeConnectCard() {
  const [exchange, setExchange] = React.useState('');
  const [name, setName] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [apiSecret, setApiSecret] = React.useState('');
  const [connecting, setConnecting] = React.useState(false);

  const handleExchangeChange = (e: SelectChangeEvent) => setExchange(e.target.value);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // TODO: Call connectExchange API
      console.log('Connecting to', exchange, name);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card sx={{ bgcolor: '#111827', border: '1px solid #1f2937' }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#f3f4f6', mb: 2 }}>
          Connect Exchange
        </Typography>

        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: '#9ca3af' }}>Exchange</InputLabel>
            <Select
              value={exchange}
              onChange={handleExchangeChange}
              label="Exchange"
              sx={{ color: '#f3f4f6', '.MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}
            >
              {EXCHANGES.map((ex) => (
                <MenuItem key={ex.value} value={ex.value} disabled={ex.value === 'FUTU' || ex.value === 'IBKR'}>
                  {ex.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Account Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            sx={{ input: { color: '#f3f4f6' }, label: { color: '#9ca3af' }, '.MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}
          />

          <TextField
            label="API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            fullWidth
            sx={{ input: { color: '#f3f4f6' }, label: { color: '#9ca3af' }, '.MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}
          />

          <TextField
            label="API Secret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            fullWidth
            sx={{ input: { color: '#f3f4f6' }, label: { color: '#9ca3af' }, '.MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}
          />

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleConnect}
            disabled={!exchange || !name || !apiKey || !apiSecret || connecting}
            sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </Button>
        </Stack>

        {/* Status indicator */}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip label="Binance: not connected" size="small" sx={{ bgcolor: '#1f2937', color: '#9ca3af' }} />
          <Chip label="Bybit: not connected" size="small" sx={{ bgcolor: '#1f2937', color: '#9ca3af' }} />
        </Stack>
      </CardContent>
    </Card>
  );
}
