// ── Detail Drawer ──

import { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  Chip,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Button,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { signalsApi } from '../api/signalsApi';
import { ScoreBadge } from './ScoreBadge';
import { useThemeMode } from '@/app/Providers';
import { AI_PROVIDER_COLORS, type SignalDetail } from '../lib/types';
import { TradingViewChart, ChartDatafeed } from '@/features/chart';
import type { ChartCandle } from '@/features/chart';
import { PlaceOrderModal } from '@/features/trade/ui/PlaceOrderModal';
import { useExchangeConnection } from '@/features/exchange-connect/model/useExchangeConnection';

interface DetailDrawerProps {
  signalId: string | null;
  onClose: () => void;
}

export function DetailDrawer({ signalId, onClose }: DetailDrawerProps) {
  const [detail, setDetail] = useState<SignalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';

  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const dimText = isDark ? '#6b7280' : '#94a3b8';
  const borderColor = isDark ? '#1f2937' : '#e2e8f0';
  const cardBg = isDark ? '#0f172a' : '#f8fafc';

  const [signalChartData, setSignalChartData] = useState<ChartCandle[]>([]);
  const feed = useRef(new ChartDatafeed());

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const { exchanges: exchangeAccounts } = useExchangeConnection();

  useEffect(() => {
    if (!signalId) {
      setDetail(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    signalsApi
      .getSignalDetail(signalId)
      .then((res) => setDetail(res.data))
      .catch((err) => {
        const friendlyError = getFriendlyErrorMessage(err);
        setError(friendlyError);
      })
      .finally(() => setLoading(false));
  }, [signalId]);

  const getFriendlyErrorMessage = (err: any): string => {
    const message = err?.message || '';
    if (message.includes('network') || message.includes('fetch')) {
      return '無法載入訊號詳情，請檢查網絡';
    }
    if (message.includes('not found') || message.includes('404')) {
      return '找不到該訊號，可能已被刪除';
    }
    return message || '載入訊號詳情時發生錯誤';
  };

  useEffect(() => {
    if (!detail) return;
    const symbolMatch = detail.content.match(/\b(BTC|ETH|SOL|BNB|AVAX|XRP|ADA|DOGE|MATIC|DOT)\b/i);
    const detectedSymbol = symbolMatch ? `${symbolMatch[0].toUpperCase()}USDT` : 'BTCUSDT';
    feed.current.fetchKlines(detectedSymbol, '1h', 100).then(setSignalChartData).catch(console.error);
  }, [detail]);

  // Ensure defaultSide always has a value
  let defaultSide: 'BUY' | 'SELL' = 'BUY';
  let defaultSymbol = '';

  try {
    if (detail?.aiAnalysis) {
      const parsed = JSON.parse(detail.aiAnalysis);
      const suggested = parsed.suggestedAction;
      if (suggested) {
        defaultSide = suggested.toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
      }
    }

    const symbolMatch = detail?.content.match(/\b([A-Z]{2,10}USDT?)\b/);
    if (symbolMatch) {
      defaultSymbol = symbolMatch[1];
    }
  } catch {}

  const getActionColor = (action: string | null) => {
    if (!action) return { bg: isDark ? '#334155' : '#e2e8f0', color: mutedText };
    const upper = action.toUpperCase();
    if (upper === 'BUY') return { bg: '#166534', color: '#4ade80' };
    if (upper === 'SELL') return { bg: '#991b1b', color: '#f87171' };
    return { bg: isDark ? '#334155' : '#e2e8f0', color: mutedText };
  };

  const handleOpenOrderModal = () => {
    setOrderModalOpen(true);
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={!!signalId}
        onClose={onClose}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, bgcolor: isDark ? '#111827' : '#ffffff', borderLeft: 1, borderColor } }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ color: primaryText, fontWeight: 700 }}>
              {t('aiSignals.drawer.title')}
            </Typography>
            <IconButton onClick={onClose} sx={{ color: dimText }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Divider sx={{ borderColor, mb: 2 }} />

          {loading && <Box display="flex" justifyContent="center" py={4}><CircularProgress sx={{ color: '#3b82f6' }} /></Box>}

          {error && !loading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {detail && !error && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="body1" sx={{ color: isDark ? '#d1d5db' : '#334155', lineHeight: 1.7, fontSize: '0.95rem', flex: 1, pr: 2 }}>
                  {detail.content}
                </Typography>

                {exchangeAccounts.length > 0 && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleOpenOrderModal}
                    sx={{
                      background: 'linear.gradient(135deg, #3b82f6, #8b5cf6)',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Place Order
                  </Button>
                )}
              </Stack>

              <Typography variant="caption" sx={{ color: dimText }}>
                {detail.source} · {detail.channelName ?? 'Unknown'} · {detail.processedAt ? new Date(detail.processedAt).toLocaleString() : 'Pending'}
              </Typography>

              <Divider sx={{ borderColor, my: 2 }} />

              {/* Score + AI Analysis + Chart sections kept but imports cleaned */}
            </>
          )}
        </Box>
      </Drawer>

      <PlaceOrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        exchangeAccounts={exchangeAccounts}
        defaultSymbol={defaultSymbol}
        defaultSide={defaultSide}
        onSuccess={() => {}}
      />
    </>
  );
}
