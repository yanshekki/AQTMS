// ── Risk Dashboard Page (Phase A – Full Spec) ──
// Real-time risk monitoring, correlation matrix, alerts, copy-to-clipboard hedge suggestions.
// Theme-aware, responsive, with loading / error / empty states + toast feedback.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Grid, Card, CardContent,
  Chip, Box, Stack, LinearProgress, CircularProgress,
  Button, Snackbar, Alert, IconButton, Tooltip, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, useMediaQuery, useTheme,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import { riskApi } from '@/shared/api/riskApi';

// ── Types ──

interface ConcentrationItem {
  asset: string;
  weight: number;
  riskLevel: string;
}

interface BetaExposureItem {
  asset: string;
  betaVsBTC: number;
  betaVsETH: number;
  hedgeSuggestion?: string;
}

interface CorrelationPair {
  pair: string;
  value: number;
}

interface RiskAlert {
  rule: string;
  status: 'WARNING' | 'BREACHED';
  message: string;
  action: string;
}

interface RiskData {
  riskScore: number;
  var95: number;
  var99: number;
  cvar95: number;
  maxDrawdown: number;
  currentDrawdown: number;
  concentrationRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  concentration: ConcentrationItem[];
  betaExposure: BetaExposureItem[];
  correlationMatrix: CorrelationPair[];
  alerts: RiskAlert[];
}








// Sub-components use local useTranslation
function RiskScoreCard({
  score, isDark, mutedText, cardBg, borderColor,
}: {
  score: number;
  isDark: boolean;
  mutedText: string;
  cardBg: string;
  borderColor: string;
}) {
  const { t } = useTranslation();
  const color = score <= 30 ? '#22c55e' : score <= 60 ? '#f59e0b' : '#ef4444';
  const label = score <= 30 ? t('risk.riskLevels.low') : score <= 60 ? t('risk.riskLevels.medium') : t('risk.riskLevels.high');
  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, textAlign: 'center', backdropFilter: 'blur(12px)', height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="caption" sx={{ color: mutedText, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('risk.riskScore')}
        </Typography>
        <Typography variant="h2" sx={{ color, fontWeight: 900, mt: 1, fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
          {score}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={score}
          sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: isDark ? '#1f2937' : '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }}
        />
        <Chip label={label} size="small" sx={{ mt: 1.5, bgcolor: `${color}20`, color, fontWeight: 700 }} />
      </CardContent>
    </Card>
  );
}

function RiskMetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, backdropFilter: 'blur(12px)', height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="caption" sx={{ color: mutedText, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ color: color ?? primaryText, fontWeight: 800, mt: 0.5, fontSize: { xs: '1.1rem', md: '1.3rem' } }}>
          {value}
        </Typography>
        {sub && <Typography variant="caption" sx={{ color: mutedText, fontSize: '0.65rem' }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

function ConcentrationCard({
  items, isDark, primaryText, mutedText, cardBg, borderColor,
}: {
  items: ConcentrationItem[];
  isDark: boolean;
  primaryText: string;
  mutedText: string;
  cardBg: string;
  borderColor: string;
}) {
  const { t } = useTranslation();
  const levelColor = (level: string) =>
    level === 'CRITICAL' ? '#ef4444' : level === 'HIGH' ? '#f59e0b' : '#22c55e';
  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, backdropFilter: 'blur(12px)', height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>{t('risk.concentrationTitle')}</Typography>
        {items.map((c) => (
          <Box key={c.asset} mb={1.5}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>{c.asset}</Typography>
              <Chip label={t(`risk.concentrationLevels.${c.riskLevel}` as any, c.riskLevel)} size="small"
                sx={{ bgcolor: `${levelColor(c.riskLevel)}20`, color: levelColor(c.riskLevel), fontSize: '0.6rem', height: 20 }} />
            </Stack>
            <LinearProgress variant="determinate" value={Math.min(c.weight, 100)}
              sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? '#1f2937' : '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: levelColor(c.riskLevel), borderRadius: 3 } }} />
            <Typography variant="caption" sx={{ color: mutedText }}>{c.weight.toFixed(1)}% {t('risk.ofPortfolio')}</Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

function BetaExposureCard({
  items, onCopyHedge, isDark, primaryText, mutedText, cardBg, borderColor,
}: {
  items: BetaExposureItem[];
  onCopyHedge: (text: string) => void;
  isDark: boolean;
  primaryText: string;
  mutedText: string;
  cardBg: string;
  borderColor: string;
}) {
  const { t } = useTranslation();
  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, backdropFilter: 'blur(12px)', height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>{t('risk.betaExposure')}</Typography>
        {items.map((b) => (
          <Stack key={b.asset} direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap"
            sx={{ py: 1, borderBottom: '1px solid', borderColor: isDark ? '#1f2937' : '#f1f5f9' }}>
            <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600, minWidth: 60 }}>{b.asset}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={`β BTC: ${b.betaVsBTC.toFixed(2)}`} size="small"
                sx={{ bgcolor: Math.abs(b.betaVsBTC) > 1.5 ? '#ef444420' : '#22c55e20', color: Math.abs(b.betaVsBTC) > 1.5 ? '#ef4444' : '#22c55e', fontSize: '0.6rem' }} />
              <Chip label={`β ETH: ${b.betaVsETH.toFixed(2)}`} size="small"
                sx={{ bgcolor: Math.abs(b.betaVsETH) > 1.5 ? '#ef444420' : '#22c55e20', color: Math.abs(b.betaVsETH) > 1.5 ? '#ef4444' : '#22c55e', fontSize: '0.6rem' }} />
              {b.hedgeSuggestion && (
                <Tooltip title={t('risk.actions.copyHedge')}>
                  <IconButton size="small" onClick={() => onCopyHedge(b.hedgeSuggestion!)}>
                    <ContentCopyIcon sx={{ fontSize: 14, color: mutedText }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        ))}
      </CardContent>
    </Card>
  );
}

function CorrelationMatrix({
  matrix, isDark, primaryText, mutedText, cardBg, borderColor,
}: {
  matrix: CorrelationPair[];
  isDark: boolean;
  primaryText: string;
  mutedText: string;
  cardBg: string;
  borderColor: string;
}) {
  const { t } = useTranslation();
  const assetSet = new Set<string>();
  matrix.forEach((p) => {
    const parts = p.pair.split('-');
    if (parts[0]) assetSet.add(parts[0]);
    if (parts[1]) assetSet.add(parts[1]);
  });
  const assets = Array.from(assetSet).slice(0, 8);

  const lookup = new Map<string, number>();
  matrix.forEach((p) => {
    lookup.set(p.pair, p.value);
    const parts = p.pair.split('-');
    if (parts[0] && parts[1]) lookup.set(`${parts[1]}-${parts[0]}`, p.value);
  });

  function corrColor(v: number): string {
    if (v < 0) return '#22c55e';
    if (v < 0.3) return '#4ade80';
    if (v < 0.5) return '#fbbf24';
    if (v < 0.7) return '#f97316';
    return '#ef4444';
  }

  const cellSize = { xs: 36, md: 48 };

  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, backdropFilter: 'blur(12px)', height: '100%' }}>
      <CardContent sx={{ overflowX: 'auto' }}>
        <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>{t('risk.correlationMatrix')}</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Stack direction="row" alignItems="center" spacing={0}>
            <Box sx={{ width: cellSize, minWidth: cellSize, height: cellSize }} />
            {assets.map((a) => (
              <Box key={a} sx={{ width: cellSize, minWidth: cellSize, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ color: mutedText, fontWeight: 700, fontSize: '0.55rem' }}>{a}</Typography>
              </Box>
            ))}
          </Stack>
          {assets.map((rowAsset) => (
            <Stack key={rowAsset} direction="row" alignItems="center" spacing={0}>
              <Box sx={{ width: cellSize, minWidth: cellSize, height: cellSize, display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: mutedText, fontWeight: 700, fontSize: '0.55rem' }}>{rowAsset}</Typography>
              </Box>
              {assets.map((colAsset) => {
                if (rowAsset === colAsset) {
                  return (
                    <Box key={colAsset} sx={{ width: cellSize, minWidth: cellSize, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.55rem', color: primaryText, fontWeight: 800 }}>1.0</Typography>
                    </Box>
                  );
                }
                const val = lookup.get(`${rowAsset}-${colAsset}`);
                return (
                  <Box key={colAsset} sx={{
                    width: cellSize, minWidth: cellSize, height: cellSize,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: val != null ? `${corrColor(val)}30` : 'transparent',
                    border: '1px solid', borderColor: val != null ? corrColor(val) : 'transparent',
                    borderRadius: 1, transition: 'all 0.2s',
                    '&:hover': { transform: 'scale(1.1)', zIndex: 1 },
                  }}>
                    <Typography variant="caption" sx={{ fontSize: '0.55rem', color: val != null ? corrColor(val) : mutedText, fontWeight: 600 }}>
                      {val != null ? val.toFixed(2) : '—'}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          ))}
        </Box>
        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" justifyContent="center">
          <Chip label={t('risk.legend.negative')} size="small" sx={{ bgcolor: '#22c55e20', color: '#22c55e', fontSize: '0.6rem', height: 20 }} />
          <Chip label={t('risk.legend.low')} size="small" sx={{ bgcolor: '#4ade8020', color: '#4ade80', fontSize: '0.6rem', height: 20 }} />
          <Chip label={t('risk.legend.moderate')} size="small" sx={{ bgcolor: '#fbbf2420', color: '#fbbf24', fontSize: '0.6rem', height: 20 }} />
          <Chip label={t('risk.legend.high')} size="small" sx={{ bgcolor: '#f9731620', color: '#f97316', fontSize: '0.6rem', height: 20 }} />
          <Chip label={t('risk.legend.veryHigh')} size="small" sx={{ bgcolor: '#ef444420', color: '#ef4444', fontSize: '0.6rem', height: 20 }} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function RiskAlertList({
  alerts, onCopyAction, isDark, primaryText, mutedText, cardBg, borderColor,
}: {
  alerts: RiskAlert[];
  onCopyAction: (text: string) => void;
  isDark: boolean;
  primaryText: string;
  mutedText: string;
  cardBg: string;
  borderColor: string;
}) {
  const { t } = useTranslation();
  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, backdropFilter: 'blur(12px)' }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>
          <WarningAmberIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle', color: '#f59e0b' }} />
          {t('risk.riskAlerts')}
        </Typography>
        <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? '#0f172a' : '#f1f5f9' }}>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>{t('risk.tableHeaders.rule')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>{t('risk.tableHeaders.status')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>{t('risk.tableHeaders.message')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>{t('risk.tableHeaders.suggestedAction')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((a, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ color: primaryText, fontSize: '0.75rem', borderColor, fontWeight: 600 }}>{a.rule}</TableCell>
                  <TableCell sx={{ borderColor }}>
                    <Chip
                      icon={a.status === 'BREACHED' ? <ErrorOutlineIcon sx={{ fontSize: 14 }} /> : <WarningAmberIcon sx={{ fontSize: 14 }} />}
                      label={t(`risk.alertStatus.${a.status}` as any, a.status)}
                      size="small"
                      sx={{ bgcolor: a.status === 'BREACHED' ? '#ef444420' : '#f59e0b20', color: a.status === 'BREACHED' ? '#ef4444' : '#f59e0b', fontSize: '0.6rem', height: 22 }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{a.message}</TableCell>
                  <TableCell sx={{ borderColor }}>
                    <Button size="small" variant="outlined" startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                      onClick={() => onCopyAction(a.action)}
                      sx={{ borderColor: '#3b82f6', color: '#3b82f6', fontSize: '0.65rem', borderRadius: 2, textTransform: 'none', whiteSpace: 'nowrap' }}>
                      {t('risk.actions.copy')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

export function RiskPage() {
  const { mode } = useThemeMode();
  const theme = useTheme();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await riskApi.getMetrics([
        { asset: 'BTC', quantity: 0.5, currentPrice: 50000, historicalReturns: [] },
        { asset: 'ETH', quantity: 4.0, currentPrice: 3200, historicalReturns: [] },
        { asset: 'SOL', quantity: 50, currentPrice: 150, historicalReturns: [] },
      ]);
      setData(response.data as RiskData);
    } catch (err: unknown) {
      // Backend unavailable — show empty state, not fake data
      setError(t('risk.failedToFetch'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(true), 15_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ open: true, message: t('toast.copiedToClipboard'), severity: 'success' });
    } catch {
      setToast({ open: true, message: t('toast.failedToCopy'), severity: 'error' });
    }
  }, [t]);

  const handleManualRefresh = useCallback(() => {
    fetchData(true);
    setToast({ open: true, message: t('toast.refreshing'), severity: 'info' });
  }, [fetchData, t]);

  const riskScoreColor = (data?.riskScore ?? 0) <= 30 ? '#22c55e' : (data?.riskScore ?? 0) <= 60 ? '#f59e0b' : '#ef4444';

  if (loading && !data) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Box className="fade-in-up">
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, mb: 1 }}>
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', color: mutedText }} />{t('risk.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: mutedText, mb: 3 }}>{t('risk.loading')}</Typography>
        </Box>
        <Grid container spacing={{ xs: 1.5, md: 3 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rounded" height={isMobile ? 140 : 180} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
            </Grid>
          ))}
          <Grid item xs={12} md={6}><Skeleton variant="rounded" height={300} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} /></Grid>
          <Grid item xs={12} md={6}><Skeleton variant="rounded" height={300} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} /></Grid>
          <Grid item xs={12}><Skeleton variant="rounded" height={280} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} /></Grid>
        </Grid>
      </Container>
    );
  }

  if (error && !data) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Box className="fade-in-up">
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, mb: 1 }}>
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#ef4444' }} />{t('risk.title')}
          </Typography>
        </Box>
        <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, textAlign: 'center', py: 8, px: 3 }}>
          <ErrorOutlineIcon sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#ef4444', mb: 1, fontWeight: 700 }}>{t('risk.failedToLoad')}</Typography>
          <Typography variant="body2" sx={{ color: mutedText, mb: 3 }}>{error}</Typography>
          <Button variant="contained" onClick={handleManualRefresh} startIcon={<RefreshIcon />} sx={{ borderRadius: 3 }}>
            {t('risk.actions.retry')}
          </Button>
        </Card>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Box className="fade-in-up">
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, mb: 1 }}>
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', color: mutedText }} />{t('risk.title')}
          </Typography>
        </Box>
        <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, textAlign: 'center', py: 8, px: 3 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: mutedText, mb: 2 }} />
          <Typography variant="h6" sx={{ color: mutedText, mb: 1, fontWeight: 700 }}>{t('risk.noData')}</Typography>
          <Typography variant="body2" sx={{ color: isDark ? '#374151' : '#cbd5e1' }}>{t('risk.noDataHint')}</Typography>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={1} spacing={1}>
          <Box>
            <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
              <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', color: riskScoreColor }} />{t('risk.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: mutedText }}>{t('risk.subtitle')}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {refreshing && <CircularProgress size={16} sx={{ color: mutedText }} />}
            <Chip
              icon={<RefreshIcon sx={{ fontSize: 14 }} />}
              label={refreshing ? t('risk.actions.refreshing') : t('risk.actions.auto15s')}
              size="small"
              onClick={handleManualRefresh}
              sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText, cursor: 'pointer', fontSize: '0.65rem' }}
            />
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={{ xs: 1.5, md: 3 }} className="stagger-children">
        <Grid item xs={12} sm={6} md={3}>
          <RiskScoreCard score={data.riskScore} isDark={isDark} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <RiskMetricCard label={t('risk.var95_1Day')} value={`$${data.var95.toLocaleString()}`} sub={t('risk.var95Sub')} color={data.var95 > 3000 ? '#ef4444' : '#22c55e'} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <RiskMetricCard label={t('risk.var99_1Day')} value={`$${data.var99.toLocaleString()}`} sub={t('risk.var99Sub')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <RiskMetricCard label={t('risk.cvar95')} value={`$${data.cvar95.toLocaleString()}`} sub={t('risk.cvar95Sub')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <RiskMetricCard label={t('risk.maxDrawdown')} value={`${data.maxDrawdown}%`}
            sub={`${t('risk.currentDrawdown')}: ${data.currentDrawdown}%`}
            color={data.maxDrawdown > 25 ? '#ef4444' : data.maxDrawdown > 15 ? '#f59e0b' : '#22c55e'} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <RiskMetricCard label={t('risk.concentrationRisk')} value={t(`risk.concentrationLevels.${data.concentrationRisk}` as any, data.concentrationRisk)}
            sub={t('risk.concentrationSub')}
            color={data.concentrationRisk === 'CRITICAL' ? '#ef4444' : data.concentrationRisk === 'HIGH' ? '#f59e0b' : '#22c55e'} />
        </Grid>
        <Grid item xs={12} md={6}>
          <ConcentrationCard items={data.concentration} isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} />
        </Grid>
        <Grid item xs={12} md={6}>
          <BetaExposureCard items={data.betaExposure} onCopyHedge={handleCopy} isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} />
        </Grid>
        <Grid item xs={12} lg={6}>
          <CorrelationMatrix matrix={data.correlationMatrix} isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} />
        </Grid>
        <Grid item xs={12} lg={6}>
          <RiskAlertList alerts={data.alerts} onCopyAction={handleCopy} isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} />
        </Grid>
      </Grid>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast((prev) => ({ ...prev, open: false }))} severity={toast.severity} variant="filled" sx={{ borderRadius: 3, fontWeight: 600 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
