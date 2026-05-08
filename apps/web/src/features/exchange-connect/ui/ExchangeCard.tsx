// ── Exchange Card (Enhanced) ──

import { useState } from 'react';
import {
  Card, CardContent, Typography, Chip, Box, Stack, IconButton, Tooltip, LinearProgress, Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import type { ExchangeAccount } from '../lib/schemas';

interface ExchangeCardProps {
  account: ExchangeAccount;
  onDelete?: (id: string) => void;
  onTest?: (id: string) => Promise<boolean>;
  isTesting?: boolean;
  isDeleting?: boolean;
}

const EXCHANGE_COLORS: Record<string, string> = {
  binance: '#F0B90B',
  bybit: '#F7A600',
};

export function ExchangeCard({
  account,
  onDelete,
  onTest,
  isTesting = false,
  isDeleting = false,
}: ExchangeCardProps) {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';

  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const dimText = isDark ? '#6b7280' : '#94a3b8';

  const color = EXCHANGE_COLORS[account.exchange] ?? '#3b82f6';

  const statusConfig = {
    CONNECTED: { icon: <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 16 }} />, color: '#22c55e', label: t('exchanges.status.connected') },
    ERROR: { icon: <ErrorIcon sx={{ color: '#ef4444', fontSize: 16 }} />, color: '#ef4444', label: t('exchanges.status.error') },
    TESTING: { icon: <SyncIcon sx={{ color: '#f59e0b', fontSize: 16 }} />, color: '#f59e0b', label: t('exchanges.status.testing') },
    DISCONNECTED: { icon: <ErrorIcon sx={{ color: dimText, fontSize: 16 }} />, color: dimText, label: t('exchanges.status.disconnected') },
  };

  const currentStatus = statusConfig[account.status as keyof typeof statusConfig] || statusConfig.DISCONNECTED;

  const handleDelete = () => {
    if (onDelete && window.confirm(t('exchanges.confirmDelete') || 'Disconnect this exchange?')) {
      onDelete(account.id);
    }
  };

  const handleTest = async () => {
    if (onTest) {
      await onTest(account.id);
    }
  };

  return (
    <Card
      sx={{
        bgcolor: isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        border: 1,
        borderColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)',
        borderLeft: `4px solid ${color}`,
        borderRadius: 3,
        transition: 'all 0.2s',
        '&:hover': { borderColor: color, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, textTransform: 'capitalize' }}>
              {account.exchange}
            </Typography>
            <Chip
              icon={currentStatus.icon}
              label={currentStatus.label}
              size="small"
              sx={{
                bgcolor: `${currentStatus.color}15`,
                color: currentStatus.color,
                fontWeight: 600,
                height: 26,
              }}
            />
          </Stack>

          <Stack direction="row" spacing={0.5}>
            {onTest && (
              <Tooltip title={t('exchanges.testConnection') || 'Test Connection'}>
                <IconButton size="small" onClick={handleTest} disabled={isTesting || isDeleting}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title={t('exchanges.disconnect') || 'Disconnect'}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={handleDelete}
                  disabled={isDeleting || isTesting}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        {/* Account Name */}
        {account.name && (
          <Typography variant="caption" sx={{ color: mutedText, display: 'block', mb: 1 }}>
            {account.name}
          </Typography>
        )}

        {/* Balances */}
        {account.balances && account.balances.length > 0 ? (
          <Box sx={{ mt: 1, mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: dimText, fontWeight: 600 }}>
              {t('exchanges.balances') || 'Balances'}
            </Typography>
            <Stack spacing={0.5} mt={0.5}>
              {account.balances.slice(0, 4).map((b) => (
                <Box key={b.asset} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ color: mutedText, fontWeight: 500 }}>
                    {b.asset}
                  </Typography>
                  <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>
                    {parseFloat(b.free).toFixed(4)}
                    {parseFloat(b.locked) > 0 && (
                      <span style={{ color: dimText, fontSize: '0.75rem' }}> (+{parseFloat(b.locked).toFixed(2)} locked)</span>
                    )}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: dimText, fontStyle: 'italic' }}>
            {t('exchanges.noBalanceData') || 'No balance data yet. Test connection to load.'}
          </Typography>
        )}

        {/* Last Sync */}
        <Box mt={1}>
          <Typography variant="caption" sx={{ color: dimText }}>
            {account.lastSyncAt
              ? `${t('exchanges.lastSynced') || 'Last synced'}: ${new Date(account.lastSyncAt).toLocaleString()}`
              : t('exchanges.notYetSynced') || 'Not synced yet'}
          </Typography>

          {(isTesting || account.status === 'TESTING') && (
            <LinearProgress sx={{ mt: 0.8, bgcolor: isDark ? '#1f2937' : '#e2e8f0', height: 3, borderRadius: 2 }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
