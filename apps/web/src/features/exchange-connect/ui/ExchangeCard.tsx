// ── Exchange Card (with Paper Positions display) ──

import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import type { ExchangeAccount } from '../lib/schemas';

interface PaperPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  unrealizedPnl: number;
}

interface ExchangeCardProps {
  account: ExchangeAccount & { isPaperTrading?: boolean };
  paperPositions?: PaperPosition[];
  totalUnrealizedPnl?: number;
  onDelete?: (id: string) => Promise<boolean> | void;
  onTest?: (id: string) => Promise<boolean>;
  onTogglePaperTrading?: (id: string, isPaperTrading: boolean) => Promise<void>;
  isTesting?: boolean;
  isDeleting?: boolean;
  isLoadingPositions?: boolean;
}

export function ExchangeCard({
  account,
  paperPositions = [],
  totalUnrealizedPnl = 0,
  onDelete,
  onTest,
  onTogglePaperTrading,
  isTesting = false,
  isDeleting = false,
  isLoadingPositions = false,
}: ExchangeCardProps) {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';

  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const dimText = isDark ? '#6b7280' : '#94a3b8';

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const color = account.exchange.toLowerCase() === 'binance' ? '#F0B90B' : '#F7A600';

  const isPaperTrading = account.isPaperTrading ?? false;

  const statusConfig: Record<string, any> = {
    CONNECTED: {
      icon: <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 16 }} />,
      color: '#22c55e',
      label: t('exchanges.status.connected', '已連接'),
    },
    ERROR: {
      icon: <ErrorIcon sx={{ color: '#ef4444', fontSize: 16 }} />,
      color: '#ef4444',
      label: t('exchanges.status.error', '錯誤'),
    },
    TESTING: {
      icon: <SyncIcon sx={{ color: '#f59e0b', fontSize: 16 }} />,
      color: '#f59e0b',
      label: t('exchanges.status.testing', '測試中'),
    },
  };

  const currentStatus = statusConfig[account.status] || statusConfig.ERROR;

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (onDelete) {
      await onDelete(account.id);
    }
    setDeleteDialogOpen(false);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  const handleTest = async () => {
    if (onTest) {
      await onTest(account.id);
    }
  };

  const handleTogglePaperTrading = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onTogglePaperTrading) return;

    setIsToggling(true);
    try {
      await onTogglePaperTrading(account.id, event.target.checked);
    } finally {
      setIsToggling(false);
    }
  };

  const formatPnl = (pnl: number) => {
    const color = pnl >= 0 ? '#22c55e' : '#ef4444';
    const sign = pnl >= 0 ? '+' : '';
    return (
      <Typography component="span" sx={{ color, fontWeight: 600 }}>
        {sign}{pnl.toFixed(2)}
      </Typography>
    );
  };

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          borderLeft: `4px solid ${color}`,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color={primaryText}>
                {account.name || account.exchange}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                <Chip
                  label={account.exchange}
                  size="small"
                  sx={{ bgcolor: `${color}20`, color: color, fontWeight: 600 }}
                />
                {isPaperTrading && (
                  <Chip
                    label="PAPER"
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                  />
                )}
              </Stack>
            </Box>

            <Stack direction="row" spacing={0.5}>
              {onTest && (
                <Tooltip title={t('exchanges.testConnection', '測試連接')}>
                  <IconButton
                    size="small"
                    onClick={handleTest}
                    disabled={isTesting || isDeleting}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title={t('exchanges.disconnect', '斷開連接')}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={handleDeleteClick}
                    disabled={isDeleting || isTesting}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>

          {/* Status */}
          <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            {currentStatus.icon}
            <Typography variant="body2" sx={{ color: currentStatus.color, fontWeight: 600 }}>
              {currentStatus.label}
            </Typography>
          </Stack>

          {/* Paper Trading Toggle */}
          {onTogglePaperTrading && (
            <FormControlLabel
              control={
                <Switch
                  checked={isPaperTrading}
                  onChange={handleTogglePaperTrading}
                  disabled={isToggling || isDeleting || isTesting}
                  size="small"
                />
              }
              label={
                <Typography variant="caption" color={isPaperTrading ? 'warning.main' : mutedText}>
                  {isPaperTrading ? '模擬交易 (Paper)' : '真實交易'}
                </Typography>
              }
              sx={{ mb: 1 }}
            />
          )}

          {/* Paper Positions Display */}
          {isPaperTrading && (
            <Box
              sx={{
                mb: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" color="warning.main" fontWeight={600}>
                  📊 Paper Trading 持倉
                </Typography>
                {isLoadingPositions && <LinearProgress sx={{ width: 60, height: 2 }} />}
              </Stack>

              {paperPositions.length > 0 ? (
                <Stack spacing={0.75}>
                  {paperPositions.slice(0, 3).map((pos, index) => (
                    <Stack key={index} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color={primaryText} fontWeight={500}>
                        {pos.symbol}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color={dimText}>
                          {pos.quantity.toFixed(4)}
                        </Typography>
                        {formatPnl(pos.unrealizedPnl)}
                      </Stack>
                    </Stack>
                  ))}
                  {paperPositions.length > 3 && (
                    <Typography variant="caption" color={dimText}>
                      +{paperPositions.length - 3} more...
                    </Typography>
                  )}
                  <Box sx={{ pt: 0.5, borderTop: '1px dashed', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color={dimText}>
                        Total PnL
                      </Typography>
                      {formatPnl(totalUnrealizedPnl)}
                    </Stack>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="body2" color={dimText} sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                  暫無持倉
                </Typography>
              )}
            </Box>
          )}

          {/* Balances */}
          {account.balances && account.balances.length > 0 ? (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color={dimText} fontWeight={600}>
                {t('exchanges.balances', '餘額')}
              </Typography>
              <Stack spacing={0.5} mt={0.5}>
                {account.balances.slice(0, 3).map((balance, index) => (
                  <Stack key={index} direction="row" justifyContent="space-between">
                    <Typography variant="body2" color={mutedText}>
                      {balance.asset}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color={primaryText}>
                      {parseFloat(balance.free).toFixed(4)}
                    </Typography>
                  </Stack>
                ))}
                {account.balances.length > 3 && (
                  <Typography variant="caption" color={dimText}>
                    +{account.balances.length - 3} more...
                  </Typography>
                )}
              </Stack>
            </Box>
          ) : (
            <Typography variant="caption" color={dimText} sx={{ fontStyle: 'italic', mb: 1 }}>
              {t('exchanges.noBalanceData', '尚未同步餘額')}
            </Typography>
          )}

          {/* Last Sync */}
          <Typography variant="caption" color={dimText}>
            {account.lastSyncAt
              ? `${t('exchanges.lastSynced', '最後同步')}: ${new Date(account.lastSyncAt).toLocaleString()}`
              : t('exchanges.notYetSynced', '尚未同步')}
          </Typography>

          {(isTesting || account.status === 'TESTING') && (
            <LinearProgress sx={{ mt: 1.5, height: 3, borderRadius: 2 }} />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle>{t('exchanges.confirmDisconnect', '確認斷開連接')}</DialogTitle>
        <DialogContent>
          <Typography>
            確定要斷開「<strong>{account.name || account.exchange}</strong>」的連接嗎？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            斷開後將無法繼續接收該交易所的數據。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={isDeleting}>
            {t('common.cancel', '取消')}
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? t('common.deleting', '斷開中...') : t('exchanges.disconnect', '確認斷開')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
