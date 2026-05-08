// ── Detail Drawer (Fixed Type Error) ──

import { useState, useEffect, useRef } from 'react';
import { Drawer, Box, Typography, IconButton, Stack, Chip, Divider, CircularProgress, Card, CardContent, Button, Alert } from '@mui/material';
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

  let topSuggestedAction: string | null = null;
  let topUrgency: string | null = null;
  let defaultSide: 'BUY' | 'SELL' = 'BUY';
  let defaultSymbol = '';

  try {
    if (detail?.aiAnalysis) {
      const parsed = JSON.parse(detail.aiAnalysis);
      topSuggestedAction = parsed.suggestedAction || null;
      topUrgency = parsed.urgency || null;

      if (topSuggestedAction) {
        defaultSide = topSuggestedAction.toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
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
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
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

              {(topSuggestedAction || topUrgency) && (
                <Stack direction="row" spacing={1} mb={2}>
                  {topSuggestedAction && (
                    <Chip
                      label={`Action: ${topSuggestedAction}`}
                      sx={{
                        bgcolor: getActionColor(topSuggestedAction).bg,
                        color: getActionColor(topSuggestedAction).color,
                        fontWeight: 700,
                      }}
                    />
                  )}
                  {topUrgency && (
                    <Chip
                      label={`Urgency: ${topUrgency}`}
                      sx={{
                        bgcolor: topUrgency === 'CRITICAL' ? '#ef444420' : topUrgency === 'HIGH' ? '#f59e0b20' : '#334155',
                        color: topUrgency === 'CRITICAL' ? '#ef4444' : topUrgency === 'HIGH' ? '#f59e0b' : mutedText,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Stack>
              )}

              <Typography variant="subtitle2" sx={{ color: mutedText, mb: 1, fontWeight: 700 }}>
                {t('aiSignals.drawer.scoreSummary')}
              </Typography>
              <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
                <ScoreBadge score={detail.compositeScore} label={`${t('aiSignals.drawer.overall')} ${detail.compositeScore ?? '?'}`} />
                <ScoreBadge score={detail.truthScore} label={`${t('aiSignals.drawer.truth')} ${detail.truthScore ?? '?'}`} />
                <ScoreBadge score={detail.relevanceScore} label={`${t('aiSignals.drawer.relevance')} ${detail.relevanceScore ?? '?'}`} />
              </Stack>

              {detail.isFake && <Chip label={t('aiSignals.drawer.likelyFake')} size="small" sx={{ bgcolor: '#7f1d1d30', color: '#ef4444', mb: 2 }} />}

              <Divider sx={{ borderColor, my: 2 }} />

              <Typography variant="subtitle2" sx={{ color: mutedText, mb: 1.5, fontWeight: 700 }}>
                {t('aiSignals.drawer.aiConsensus')}
              </Typography>

              {detail.aiAnalysis ? (
                (() => {
                  try {
                    const analysis = JSON.parse(detail.aiAnalysis) as {
                      aiResponses?: Array<{
                        provider: string;
                        task: string;
                        result: {
                          reasoning?: string;
                          confidenceScore?: number;
                          affectedAssets?: string[];
                          suggestedAction?: string;
                          urgency?: string;
                        };
                      }>;
                    };

                    return analysis.aiResponses?.map((r, i) => (
                      <Card key={i} sx={{ bgcolor: cardBg, border: 1, borderColor, mb: 1.5, borderRadius: 2 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  bgcolor: AI_PROVIDER_COLORS[r.provider.split(':')[0] ?? ''] ?? '#6b7280',
                                }}
                              />
                              <Typography variant="caption" sx={{ color: primaryText, fontWeight: 700 }}>
                                {r.provider}
                              </Typography>
                            </Stack>
                            <Chip label={r.task} size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText, fontSize: '0.65rem' }} />
                          </Stack>

                          {r.result.reasoning && (
                            <Typography variant="body2" sx={{ color: mutedText, fontSize: '0.8rem', mb: 1.5, lineHeight: 1.5 }}>
                              {r.result.reasoning}
                            </Typography>
                          )}

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {r.result.suggestedAction && (
                              <Chip
                                label={r.result.suggestedAction}
                                size="small"
                                sx={{
                                  bgcolor: getActionColor(r.result.suggestedAction).bg,
                                  color: getActionColor(r.result.suggestedAction).color,
                                  fontWeight: 600,
                                }}
                              />
                            )}
                            {r.result.urgency && (
                              <Chip
                                label={`Urgency: ${r.result.urgency}`}
                                size="small"
                                sx={{
                                  bgcolor: r.result.urgency === 'CRITICAL' ? '#ef444420' : r.result.urgency === 'HIGH' ? '#f59e0b20' : cardBg,
                                  color: r.result.urgency === 'CRITICAL' ? '#ef4444' : r.result.urgency === 'HIGH' ? '#f59e0b' : mutedText,
                                }}
                              />
                            )}
                            {r.result.affectedAssets && r.result.affectedAssets.length > 0 && (
                              <Chip
                                label={r.result.affectedAssets.join(', ')}
                                size="small"
                                sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: primaryText }}
                              />
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    ));
                  } catch {
                    return <Typography variant="body2" sx={{ color: mutedText }}>{t('aiSignals.drawer.parseError')}</Typography>;
                  }
                })()
              ) : (
                <Typography variant="body2" sx={{ color: mutedText }}>{t('aiSignals.drawer.noAnalysis')}</Typography>
              )}

              {signalChartData.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: mutedText, mb: 1, fontWeight: 600 }}>
                    {t('aiSignals.drawer.priceChart')}
                  </Typography>
                  <TradingViewChart symbol="CHART" timeframe="1H" height={250} showVolume={false} data={signalChartData} />
                </Box>
              )}
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
