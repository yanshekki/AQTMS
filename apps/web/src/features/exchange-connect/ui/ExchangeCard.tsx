// ── Exchange Card ──

import { Card, CardContent, Typography, Chip, Box, Stack, IconButton, Tooltip, LinearProgress } from '@mui/material';
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

  const color = '#3b82f6';

  const statusConfig: any = {
    CONNECTED: { icon: <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 16 }} />, color: '#22c55e', label: t('exchanges.status.connected') },
    ERROR: { icon: <ErrorIcon sx={{ color: '#ef4444', fontSize: 16 }} />, color: '#ef4444', label: t('exchanges.status.error') },
  };

  const currentStatus = statusConfig[account.status] || statusConfig.ERROR;

  const handleDelete = () => {
    if (onDelete && window.confirm('Disconnect this exchange?')) {
      onDelete(account.id);
    }
  };

  const handleTest = async () => {
    if (onTest) await onTest(account.id);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {account.name || account.exchange}
            </Typography>
            <Chip label={account.exchange} size="small" />
          </Stack>

          <Stack direction="row" spacing={1}>
            {onTest && (
              <IconButton size="small" onClick={handleTest} disabled={isTesting || isDeleting}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            )}
            {onDelete && (
              <IconButton size="small" color="error" onClick={handleDelete} disabled={isDeleting || isTesting}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
