// ── Dashboard Page (Improved Error Handling) ──

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Typography, Grid, Card, CardContent, Chip, Box,
  Accordion, AccordionSummary, AccordionDetails, Stack, CircularProgress, Button, Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { useThemeMode } from '@/app/Providers';
import { TradingViewChart, ChartDatafeed } from '@/features/chart';
import type { ChartCandle, TimeFrame } from '@/features/chart';
import { portfolioApi } from '@/shared/api/portfolioApi';
import { useWebSocket } from '@/shared/lib/useWebSocket';
import { usePermissions } from '@/shared/lib/usePermissions';
import { PERMISSIONS } from '@/shared/lib/permissions';
import { authAtom } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '@/features/ai-signals/api/signalsApi';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const dimText = isDark ? '#6b7280' : '#94a3b8';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';

  const navigate = useNavigate();

  const [liveSymbol, setLiveSymbol] = useState('BTCUSDT');
  const [liveData, setLiveData] = useState<ChartCandle[]>([]);
  const [liveTimeframe, setLiveTimeframe] = useState<TimeFrame>('1H');
  const [chartExpanded, setChartExpanded] = useState(false);
  const feed = useRef(new ChartDatafeed());

  // Real portfolio data
  const auth = useAtomValue(authAtom);
  const { hasPermission } = usePermissions();
  const canViewRisk = hasPermission(PERMISSIONS.RISK_VIEW);
  const canConnectExchange = hasPermission(PERMISSIONS.EXCHANGE_CONNECT);

  const [portfolioSummary, setPortfolioSummary] = useState<{
    totalValue: number; todayPnL: number; todayPnLPercent: number;
    mtdReturn: number; ytdReturn: number;
    realizedPnL: number; unrealizedPnL: number;
  } | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    setPortfolioLoading(true);
    setPortfolioError(null);

    try {
      const res = await portfolioApi.getSummary();
      setPortfolioSummary(res.data);
    } catch (err: any) {
      const message = err?.message || '無法載入投資組合數據';
      setPortfolioError(message.includes('network') ? '網絡錯誤，無法載入投資組合' : message);
    } finally {
      setPortfolioLoading(false);
    }
  }, [auth.isAuthenticated]);

  // WebSocket
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
  const { status: wsStatus, subscribe, joinRoom } = useWebSocket({
    url: wsUrl,
    token: auth.token,
  });

  const [wsAlerts, setWsAlerts] = useState<string[]>([]);

  // Recent AI Signals with error handling
  const { data: recentSignalsData, isLoading: signalsLoading, error: signalsError } = useQuery({
    queryKey: ['dashboard-recent-signals'],
    queryFn: () => signalsApi.getRecentSignals({ limit: 5 }),
    refetchInterval: 30000,
    enabled: auth.isAuthenticated,
  });

  const recentSignals = recentSignalsData?.data ?? [];

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    if (canViewRisk) {
      const leaveRoom = joinRoom('risk');
      const unsubRisk = subscribe('risk:alert', (data: unknown) => {
        const msg = (data as { message?: string })?.message ?? 'Risk alert';
        setWsAlerts((prev) => [msg, ...prev].slice(0, 5));
      });
      unsubs.push(leaveRoom, unsubRisk);
    }
    const unsubOrder = subscribe('order:update', (data: unknown) => {
      fetchPortfolio();
      void data;
    });
    unsubs.push(unsubOrder);
    return () => { unsubs.forEach((fn) => fn()); };
  }, [subscribe, joinRoom, fetchPortfolio, canViewRisk]);

  useEffect(() => {
    if (!chartExpanded) return;
    feed.current
      .fetchKlines(liveSymbol, ChartDatafeed.timeframeToInterval(liveTimeframe), 200)
      .then(setLiveData)
      .catch(console.error);
    const interval = setInterval(() => {
      feed.current
        .fetchKlines(liveSymbol, ChartDatafeed.timeframeToInterval(liveTimeframe), 200)
        .then(setLiveData)
        .catch(console.error);
    }, 15000);
    return () => clearInterval(interval);
  }, [liveSymbol, liveTimeframe, chartExpanded]);

  const hasPortfolio = portfolioSummary !== null && portfolioSummary.totalValue > 0;
  const showViewerHint = !hasPortfolio && !canConnectExchange;

  const metricCards = [
    { label: t('dashboard.totalPortfolioValue'), value: hasPortfolio ? `$${portfolioSummary!.totalValue.toLocaleString()}` : '$0.00', hint: hasPortfolio ? t('dashboard.connected') : (showViewerHint ? t('dashboard.viewOnly') : t('dashboard.noExchangeConnected')) },
    { label: t('dashboard.todayPnL'), value: hasPortfolio ? `$${portfolioSummary!.todayPnL.toLocaleString()}` : '$0.00', hint: hasPortfolio ? `${portfolioSummary!.todayPnLPercent}%` : '0.00%' },
    { label: t('dashboard.latestAISignal'), value: recentSignals.length > 0 ? `${recentSignals[0].compositeScore?.toFixed(0) ?? '-'}` : '—', hint: recentSignals.length > 0 ? (recentSignals[0] as any).suggestedAction || 'Signal' : t('dashboard.noDataSources') },
    { label: t('dashboard.openPositions'), value: '0', hint: t('dashboard.noActiveTrades') },
    { label: t('dashboard.riskScore'), value: hasPortfolio ? `${portfolioSummary!.unrealizedPnL > 0 ? '🟢' : '🟡'} ${Math.abs(portfolioSummary!.unrealizedPnL)}` : '—', hint: t('dashboard.connectExchangeFirst') },
    { label: t('dashboard.sharpeRatio'), value: '—', hint: t('dashboard.runBacktest') },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, mb: 0.5, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: mutedText, mb: { xs: 2, md: 4 }, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
          {t('dashboard.subtitle')}
        </Typography>
      </Box>

      {/* Portfolio Error */}
      {portfolioError && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          {portfolioError}
        </Alert>
      )}

      <Grid container spacing={{ xs: 1.5, md: 3 }} className="stagger-children">
        {metricCards.map((card, i) => (
          <Grid item xs={6} sm={6} md={4} key={i}>
            <Card sx={{
              bgcolor: cardBg, backdropFilter: 'blur(12px)', border: 1, borderColor,
              borderRadius: 3, transition: 'all 0.3s ease',
              '&:hover': { borderColor: isDark ? 'rgba(0,240,255,0.3)' : 'rgba(37,99,235,0.3)', transform: 'translateY(-2px)' },
            }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="caption" sx={{ color: mutedText, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: { xs: '0.6rem', md: '0.7rem' } }}>
                  {card.label}
                </Typography>
                <Typography variant="h4" sx={{ color: primaryText, fontWeight: 800, mt: 0.5, fontSize: { xs: '1.25rem', md: '2rem' } }}>
                  {card.value}
                </Typography>
                <Chip
                  label={card.hint}
                  size="small"
                  sx={{
                    mt: 1,
                    bgcolor: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(226,232,240,0.5)',
                    color: dimText,
                    fontSize: { xs: '0.6rem', md: '0.7rem' },
                    height: { xs: 20, md: 24 },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Recent AI Signals */}
        <Grid item xs={12} md={7}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700 }}>
                  {t('dashboard.recentAISignals') || 'Recent AI Signals'}
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/ai-signals')}
                  sx={{ textTransform: 'none', color: '#3b82f6' }}
                >
                  {t('common.viewAll') || 'View All'}
                </Button>
              </Stack>

              {/* Signals Error */}
              {signalsError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  無法載入最近 AI 訊號
                </Alert>
              )}

              {signalsLoading ? (
                <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>
              ) : recentSignals.length === 0 ? (
                <Typography variant="body2" sx={{ color: dimText, textAlign: 'center', py: 2 }}>
                  {t('dashboard.noRecentSignals') || 'No recent AI signals yet. Connect data sources to start.'}
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {recentSignals.map((signal: any, index: number) => {
                    const score = signal.compositeScore ?? 0;
                    const action = signal.suggestedAction || (score >= 80 ? 'BUY' : score >= 60 ? 'HOLD' : '—');
                    return (
                      <Box
                        key={index}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(241,245,249,0.6)',
                          border: '1px solid',
                          borderColor: isDark ? '#334155' : '#e2e8f0',
                          cursor: 'pointer',
                          '&:hover': { borderColor: '#3b82f6' },
                        }}
                        onClick={() => navigate('/ai-signals')}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack>
                            <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>
                              {signal.content?.slice(0, 80)}{signal.content?.length > 80 ? '...' : ''}
                            </Typography>
                            <Typography variant="caption" sx={{ color: dimText }}>
                              {signal.source} · {signal.processedAt ? new Date(signal.processedAt).toLocaleTimeString() : ''}
                            </Typography>
                          </Stack>
                          <Stack alignItems="flex-end" spacing={0.5}>
                            <Chip
                              label={`${score?.toFixed(0) ?? '-'}`}
                              size="small"
                              sx={{
                                bgcolor: score >= 80 ? '#166534' : score >= 60 ? '#854d0e' : '#334155',
                                color: score >= 80 ? '#4ade80' : score >= 60 ? '#fde047' : mutedText,
                                fontWeight: 700,
                              }}
                            />
                            <Chip
                              label={action}
                              size="small"
                              sx={{
                                bgcolor: action === 'BUY' ? '#166534' : action === 'SELL' ? '#991b1b' : '#334155',
                                color: action === 'BUY' ? '#4ade80' : action === 'SELL' ? '#f87171' : mutedText,
                                fontWeight: 600,
                              }}
                            />
                          </Stack>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Live Chart */}
        <Grid item xs={12} md={5}>
          <Accordion
            expanded={chartExpanded}
            onChange={(_, expanded) => setChartExpanded(expanded)}
            sx={{
              bgcolor: cardBg,
              border: 1,
              borderColor,
              borderRadius: 3,
              backdropFilter: 'blur(12px)',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: mutedText }} />}>
              <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700 }}>
                {t('dashboard.liveChart')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
                {['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map((sym) => (
                  <Chip
                    key={sym}
                    label={sym}
                    onClick={() => setLiveSymbol(sym)}
                    color={liveSymbol === sym ? 'primary' : 'default'}
                    size="small"
                  />
                ))}
                {(['5m', '15m', '1H', '4H', '1D'] as TimeFrame[]).map((tf) => (
                  <Chip
                    key={tf}
                    label={tf}
                    onClick={() => setLiveTimeframe(tf)}
                    variant={liveTimeframe === tf ? 'filled' : 'outlined'}
                    size="small"
                  />
                ))}
              </Stack>
              <TradingViewChart
                symbol={liveSymbol}
                timeframe={liveTimeframe}
                height={320}
                showVolume
                data={liveData}
              />
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* WebSocket Alerts */}
        <Grid item xs={12}>
          <Stack direction="row" spacing={2} alignItems="center" mb={1}>
            <Chip
              label={`WS: ${wsStatus}`}
              size="small"
              sx={{
                bgcolor: wsStatus === 'connected' ? '#22c55e20' : '#f59e0b20',
                color: wsStatus === 'connected' ? '#22c55e' : '#f59e0b',
                fontSize: '0.65rem',
              }}
            />
            {portfolioLoading && <CircularProgress size={16} sx={{ color: '#3b82f6' }} />}
          </Stack>
          {wsAlerts.length > 0 && (
            <Box>
              {wsAlerts.map((alert, i) => (
                <Typography key={i} variant="caption" sx={{ color: '#ef4444', display: 'block' }}>
                  ⚠️ {alert}
                </Typography>
              ))}
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
