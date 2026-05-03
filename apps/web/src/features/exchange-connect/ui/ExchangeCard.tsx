// ── Exchange Card (Theme-aware) ──

import { Card, CardContent, Typography, Chip, Box, Stack, LinearProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';
import { useThemeMode } from '@/app/Providers';
import type { ExchangeAccount } from '../lib/schemas';

interface ExchangeCardProps { account: ExchangeAccount; }

const EXCHANGE_COLORS: Record<string, string> = { binance: '#F0B90B', bybit: '#F7A600' };

export function ExchangeCard({ account }: ExchangeCardProps) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const dimText = isDark ? '#6b7280' : '#94a3b8';

  const color = EXCHANGE_COLORS[account.exchange] ?? '#3b82f6';
  const statusIcon = {
    CONNECTED: <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 14 }} />,
    ERROR: <ErrorIcon sx={{ color: '#ef4444', fontSize: 14 }} />,
    TESTING: <SyncIcon sx={{ color: '#f59e0b', fontSize: 14 }} />,
    DISCONNECTED: <ErrorIcon sx={{ color: dimText, fontSize: 14 }} />,
  }[account.status];
  const statusColor = { CONNECTED: '#22c55e', ERROR: '#ef4444', TESTING: '#f59e0b', DISCONNECTED: dimText }[account.status];

  return (
    <Card sx={{ bgcolor: isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: 1, borderColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)', borderLeft: `3px solid ${color}`, borderRadius: 3, transition: 'all 0.2s', '&:hover': { borderColor: color } }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 600, textTransform: 'capitalize', fontSize: '0.9rem' }}>{account.exchange}</Typography>
            <Chip icon={statusIcon} label={account.status} size="small" sx={{ bgcolor: `${statusColor}15`, color: statusColor, fontWeight: 500, '.MuiChip-icon': { ml: 0.5 } }} />
          </Stack>
          <Typography variant="caption" sx={{ color: mutedText }}>{account.name}</Typography>
        </Stack>
        {account.balances && account.balances.length > 0 && (
          <Stack spacing={0.5} mt={1}>
            {account.balances.slice(0, 5).map((b) => (
              <Box key={b.asset} display="flex" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: mutedText }}>{b.asset}</Typography>
                <Typography variant="caption" sx={{ color: primaryText }}>
                  {parseFloat(b.free).toFixed(4)}
                  {parseFloat(b.locked) > 0 && <span style={{ color: dimText }}> (+{parseFloat(b.locked).toFixed(4)} locked)</span>}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
        <Box mt={1.5}>
          <Typography variant="caption" sx={{ color: dimText }}>{account.lastSyncAt ? `Last synced: ${new Date(account.lastSyncAt).toLocaleString()}` : 'Not yet synced'}</Typography>
          {account.status === 'TESTING' && <LinearProgress sx={{ mt: 0.5, bgcolor: isDark ? '#1f2937' : '#e2e8f0', height: 2 }} />}
        </Box>
      </CardContent>
    </Card>
  );
}
