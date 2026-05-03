// ── API Key Form (Theme-aware) ──

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField, FormControl, InputLabel, Select, MenuItem, Stack } from '@mui/material';
import { ConnectExchangeSchema, type ConnectExchangeForm } from '../lib/schemas';
import { useThemeMode } from '@/app/Providers';

interface ApiKeyFormProps { onSubmit: (data: ConnectExchangeForm) => void; disabled?: boolean; }

export function ApiKeyForm({ onSubmit, disabled }: ApiKeyFormProps) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const borderColor = isDark ? '#374151' : '#cbd5e1';
  const inputSx = { input: { color: primaryText }, label: { color: mutedText }, '.MuiOutlinedInput-notchedOutline': { borderColor } };

  const { register, handleSubmit, formState: { errors } } = useForm<ConnectExchangeForm>({
    resolver: zodResolver(ConnectExchangeSchema), defaultValues: { exchange: 'BINANCE', apiKey: '', apiSecret: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2.5}>
        <FormControl fullWidth>
          <InputLabel sx={{ color: mutedText }}>Exchange</InputLabel>
          <Select {...register('exchange')} defaultValue="binance" label="Exchange" sx={{ color: primaryText, '.MuiOutlinedInput-notchedOutline': { borderColor } }}>
            <MenuItem value="BINANCE">Binance</MenuItem>
            <MenuItem value="BYBIT">Bybit</MenuItem>
          </Select>
        </FormControl>
        <TextField label="API Key" type="password" {...register('apiKey')} error={!!errors.apiKey} helperText={errors.apiKey?.message} fullWidth disabled={disabled ?? false} sx={inputSx} />
        <TextField label="API Secret" type="password" {...register('apiSecret')} error={!!errors.apiSecret} helperText={errors.apiSecret?.message} fullWidth disabled={disabled ?? false} sx={inputSx} />
      </Stack>
    </form>
  );
}
