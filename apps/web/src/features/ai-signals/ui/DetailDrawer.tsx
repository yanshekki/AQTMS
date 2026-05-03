// ── Detail Drawer (Theme-aware) ──

import { useState, useEffect, useRef } from 'react';
import { Drawer, Box, Typography, IconButton, Stack, Chip, Divider, CircularProgress, Card, CardContent } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { signalsApi } from '../api/signalsApi';
import { ScoreBadge } from './ScoreBadge';
import { useThemeMode } from '@/app/Providers';
import { AI_PROVIDER_COLORS, type SignalDetail } from '../lib/types';
import { TradingViewChart, ChartDatafeed } from '@/features/chart';
import type { ChartCandle } from '@/features/chart';

interface DetailDrawerProps { signalId: string | null; onClose: () => void; }

export function DetailDrawer({ signalId, onClose }: DetailDrawerProps) {
  const [detail, setDetail] = useState<SignalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const dimText = isDark ? '#6b7280' : '#94a3b8';
  const borderColor = isDark ? '#1f2937' : '#e2e8f0';
  const cardBg = isDark ? '#0f172a' : '#f8fafc';
  const chipBg = isDark ? '#1e293b' : '#e2e8f0';

  // Signal chart state
  const [signalChartData, setSignalChartData] = useState<ChartCandle[]>([]);
  const feed = useRef(new ChartDatafeed());

  useEffect(() => {
    if (!signalId) { setDetail(null); return; }
    setLoading(true); setError(null);
    signalsApi.getSignalDetail(signalId).then((res) => setDetail(res.data)).catch((err) => setError(err instanceof Error ? err.message : 'Failed')).finally(() => setLoading(false));
  }, [signalId]);

  // Fetch chart data when signal detail is loaded
  useEffect(() => {
    if (!detail) return;
    const symbolMatch = detail.content.match(/\b(BTC|ETH|SOL|BNB|AVAX|XRP|ADA|DOGE|MATIC|DOT)\b/i);
    const detectedSymbol = symbolMatch ? `${symbolMatch[0].toUpperCase()}USDT` : 'BTCUSDT';
    feed.current
      .fetchKlines(detectedSymbol, '1h', 100)
      .then(setSignalChartData)
      .catch(console.error);
  }, [detail]);

  return (
    <Drawer anchor="right" open={!!signalId} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, bgcolor: isDark ? '#111827' : '#ffffff', borderLeft: 1, borderColor } }}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ color: primaryText }}>AI Analysis</Typography>
          <IconButton onClick={onClose} sx={{ color: dimText }}><CloseIcon /></IconButton>
        </Stack>
        <Divider sx={{ borderColor, mb: 2 }} />
        {loading && <Box display="flex" justifyContent="center" py={4}><CircularProgress sx={{ color: '#3b82f6' }} /></Box>}
        {error && <Typography sx={{ color: '#ef4444' }}>{error}</Typography>}
        {detail && (
          <>
            <Typography variant="body1" sx={{ color: isDark ? '#d1d5db' : '#334155', mb: 2, lineHeight: 1.7, fontSize: '0.9rem' }}>{detail.content}</Typography>
            <Typography variant="caption" sx={{ color: dimText }}>{detail.source} · {detail.channelName ?? 'Unknown'} · {detail.processedAt ? new Date(detail.processedAt).toLocaleString() : 'Pending'}</Typography>
            <Divider sx={{ borderColor, my: 2 }} />
            <Typography variant="subtitle2" sx={{ color: mutedText, mb: 1, fontWeight: 700 }}>Score Summary</Typography>
            <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              <ScoreBadge score={detail.compositeScore} label={`Overall ${detail.compositeScore ?? '?'}`} />
              <ScoreBadge score={detail.truthScore} label={`Truth ${detail.truthScore ?? '?'}`} />
              <ScoreBadge score={detail.sentimentScore !== null ? Math.abs(detail.sentimentScore) : null} label={`Sent ${detail.sentimentScore ?? '?'}`} />
              <ScoreBadge score={detail.relevanceScore} label={`Relevance ${detail.relevanceScore ?? '?'}`} />
            </Stack>
            {detail.isFake && <Chip label="⚠️ Likely Fake" size="small" sx={{ bgcolor: '#7f1d1d30', color: '#ef4444', mb: 2 }} />}
            <Divider sx={{ borderColor, my: 2 }} />
            <Typography variant="subtitle2" sx={{ color: mutedText, mb: 1, fontWeight: 700 }}>AI Consensus</Typography>
            {detail.aiAnalysis ? (() => {
              try {
                const analysis = JSON.parse(detail.aiAnalysis) as { aiResponses?: Array<{ provider: string; task: string; result: { reasoning?: string; confidenceScore?: number; affectedAssets?: string[]; suggestedAction?: string; urgency?: string } }> };
                return analysis.aiResponses?.map((r, i) => (
                  <Card key={i} sx={{ bgcolor: cardBg, border: 1, borderColor, mb: 1.5, borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: AI_PROVIDER_COLORS[r.provider.split(':')[0] ?? ''] ?? '#6b7280' }} />
                          <Typography variant="caption" sx={{ color: primaryText, fontWeight: 600 }}>{r.provider}</Typography>
                        </Stack>
                        <Chip label={r.task} size="small" sx={{ bgcolor: chipBg, color: mutedText, fontSize: '0.6rem' }} />
                      </Stack>
                      {r.result.reasoning && <Typography variant="body2" sx={{ color: mutedText, fontSize: '0.75rem', mb: 1 }}>{r.result.reasoning}</Typography>}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {r.result.suggestedAction && <Chip label={r.result.suggestedAction} size="small" sx={{ bgcolor: r.result.suggestedAction === 'BUY' ? '#22c55e20' : r.result.suggestedAction === 'SELL' ? '#ef444420' : chipBg, color: r.result.suggestedAction === 'BUY' ? '#22c55e' : r.result.suggestedAction === 'SELL' ? '#ef4444' : mutedText, fontSize: '0.6rem' }} />}
                        {r.result.urgency && <Chip label={r.result.urgency} size="small" sx={{ bgcolor: r.result.urgency === 'CRITICAL' ? '#ef444420' : r.result.urgency === 'HIGH' ? '#f59e0b20' : chipBg, color: r.result.urgency === 'CRITICAL' ? '#ef4444' : r.result.urgency === 'HIGH' ? '#f59e0b' : mutedText, fontSize: '0.6rem' }} />}
                      </Stack>
                    </CardContent>
                  </Card>
                ));
              } catch { return <Typography variant="body2" sx={{ color: mutedText }}>Parse error</Typography>; }
            })() : <Typography variant="body2" sx={{ color: mutedText }}>No AI analysis yet.</Typography>}

            {/* Price Chart */}
            {signalChartData.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: mutedText, mb: 1, fontWeight: 600 }}>
                  📈 Price Chart (1H)
                </Typography>
                <TradingViewChart symbol="CHART" timeframe="1H" height={250} showVolume={false} data={signalChartData} />
              </Box>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
}
