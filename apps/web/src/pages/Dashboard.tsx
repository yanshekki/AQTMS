// ── Dashboard Page (Responsive + Theme-aware) ──

import { useState, useEffect, useRef } from 'react';
import {
  Container, Typography, Grid, Card, CardContent, Chip, Box,
  Accordion, AccordionSummary, AccordionDetails, Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import { TradingViewChart, ChartDatafeed } from '@/features/chart';
import type { ChartCandle, TimeFrame } from '@/features/chart';

export function DashboardPage() {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const dimText = isDark ? '#6b7280' : '#94a3b8';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';

  const [liveSymbol, setLiveSymbol] = useState('BTCUSDT');
  const [liveData, setLiveData] = useState<ChartCandle[]>([]);
  const [liveTimeframe, setLiveTimeframe] = useState<TimeFrame>('1H');
  const [chartExpanded, setChartExpanded] = useState(false);
  const feed = useRef(new ChartDatafeed());

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

  const metricCards = [
    { label: t('dashboard.totalPortfolioValue'), value: '$0.00', hint: t('dashboard.noExchangeConnected') },
    { label: t('dashboard.todayPnL'), value: '$0.00', hint: '0.00%' },
    { label: t('dashboard.latestAISignal'), value: '—', hint: t('dashboard.noDataSources') },
    { label: t('dashboard.openPositions'), value: '0', hint: t('dashboard.noActiveTrades') },
    { label: t('dashboard.riskScore'), value: '—', hint: t('dashboard.connectExchangeFirst') },
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

        <Grid item xs={12}>
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
                height={400}
                showVolume
                data={liveData}
              />
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Container>
  );
}
