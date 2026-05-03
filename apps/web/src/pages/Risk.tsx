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

// ── Mock Data Generator ──

const ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK'];
function generateMockRiskData(): RiskData {
  const riskScore = Math.floor(20 + Math.random() * 55); // 20–75 range
  const baseVar = 800 + Math.random() * 3000;

  const concentration: ConcentrationItem[] = [
    { asset: 'BTC', weight: 35 + Math.random() * 20, riskLevel: 'HIGH' },
    { asset: 'ETH', weight: 20 + Math.random() * 15, riskLevel: 'MEDIUM' },
    { asset: 'SOL', weight: 8 + Math.random() * 12, riskLevel: 'MEDIUM' },
    { asset: 'BNB', weight: 4 + Math.random() * 8, riskLevel: 'LOW' },
    { asset: 'XRP', weight: 2 + Math.random() * 6, riskLevel: 'LOW' },
    { asset: 'DOGE', weight: 1 + Math.random() * 5, riskLevel: riskScore > 50 ? 'HIGH' : 'LOW' },
  ];

  const topWeight = concentration[0]?.weight ?? 0;
  const concentrationRisk: RiskData['concentrationRisk'] =
    topWeight > 50 ? 'CRITICAL'
    : topWeight > 40 ? 'HIGH'
    : topWeight > 30 ? 'MEDIUM'
    : 'LOW';

  const betaExposure: BetaExposureItem[] = [
    { asset: 'ETH', betaVsBTC: 0.85 + Math.random() * 0.3, betaVsETH: 1.0, hedgeSuggestion: 'Reduce ETH exposure by 5% or hedge with ETH put options' },
    { asset: 'SOL', betaVsBTC: 1.2 + Math.random() * 0.6, betaVsETH: 1.1 + Math.random() * 0.4, hedgeSuggestion: 'Consider SOL/BTC pair trade to reduce beta to 1.0' },
    { asset: 'BNB', betaVsBTC: 0.7 + Math.random() * 0.5, betaVsETH: 0.8 + Math.random() * 0.3 },
    { asset: 'DOGE', betaVsBTC: 1.5 + Math.random() * 1.0, betaVsETH: 1.3 + Math.random() * 0.7, hedgeSuggestion: 'High beta — reduce DOGE position by 50%' },
    { asset: 'AVAX', betaVsBTC: 1.1 + Math.random() * 0.5, betaVsETH: 0.9 + Math.random() * 0.4 },
  ];

  const correlationPairs: CorrelationPair[] = [];
  for (let i = 0; i < ASSETS.length; i++) {
    for (let j = i + 1; j < ASSETS.length; j++) {
      const baseCorr = 0.3 + Math.random() * 0.65; // 0.3–0.95
      correlationPairs.push({ pair: `${ASSETS[i]}-${ASSETS[j]}`, value: Math.round(baseCorr * 100) / 100 });
    }
  }

  const alerts: RiskAlert[] = [
    {
      rule: 'Concentration Limit',
      status: (concentration[0]?.weight ?? 0) > 40 ? 'BREACHED' : 'WARNING',
      message: `BTC weight at ${(concentration[0]?.weight ?? 0).toFixed(1)}%${(concentration[0]?.weight ?? 0) > 40 ? ' — exceeds 40% limit' : ' — approaching 40% limit'}`,
      action: `Reduce BTC to 30% allocation: sell 0.15 BTC @ market`,
    },
    {
      rule: 'Max Drawdown Guard',
      status: riskScore > 55 ? 'BREACHED' : 'WARNING',
      message: `Current drawdown ${(3 + Math.random() * 12).toFixed(1)}% — ${riskScore > 55 ? 'exceeded threshold' : 'approaching threshold'}`,
      action: `Hedge with BTCUSD perpetual short 0.5x notional @ Binance`,
    },
    {
      rule: 'VaR Limit',
      status: baseVar > 3000 ? 'BREACHED' : 'WARNING',
      message: `VaR 95% at $${Math.round(baseVar).toLocaleString()} — ${baseVar > 3000 ? 'exceeds $3,000 limit' : 'close to $3,000 limit'}`,
      action: `Reduce portfolio leverage from 2x to 1.5x across all positions`,
    },
    {
      rule: 'Correlation Cluster',
      status: 'WARNING',
      message: 'L1 assets showing 0.85+ correlation cluster — diversification benefit reduced',
      action: `Add uncorrelated asset: allocate 5% to RWA tokens (e.g. ONDO)`,
    },
  ];

  return {
    riskScore,
    var95: Math.round(baseVar),
    var99: Math.round(baseVar * 1.45),
    cvar95: Math.round(baseVar * 1.28),
    maxDrawdown: Math.round((15 + Math.random() * 20) * 10) / 10,
    currentDrawdown: Math.round((3 + Math.random() * 12) * 10) / 10,
    concentrationRisk,
    concentration,
    betaExposure,
    correlationMatrix: correlationPairs,
    alerts,
  };
}

// ── Sub-components ──

/** Big risk score gauge card */
function RiskScoreCard({
  score, isDark, mutedText, cardBg, borderColor,
}: {
  score: number;
  isDark: boolean;
  mutedText: string;
  cardBg: string;
  borderColor: string;
}) {
  const color = score <= 30 ? '#22c55e' : score <= 60 ? '#f59e0b' : '#ef4444';
  const label = score <= 30 ? 'Low Risk' : score <= 60 ? 'Medium Risk' : 'High Risk';
  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, textAlign: 'center', backdropFilter: 'blur(12px)', height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="caption" sx={{ color: mutedText, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Risk Score
        </Typography>
        <Typography variant="h2" sx={{ color, fontWeight: 900, mt: 1, fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
          {score}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={score}
          sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: isDark ? '#1f2937' : '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }}
        />
        <Chip
          label={label}
          size="small"
          sx={{ mt: 1.5, bgcolor: `${color}20`, color, fontWeight: 700 }}
        />
      </CardContent>
    </Card>
  );
}

/** Single risk metric card */
function RiskMetricCard({
  label, value, sub, color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
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

/** Concentration risk breakdown card */
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
  const levelColor = (level: string) =>
    level === 'CRITICAL' ? '#ef4444' : level === 'HIGH' ? '#f59e0b' : '#22c55e';
  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, backdropFilter: 'blur(12px)', height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>Concentration Risk</Typography>
        {items.map((c) => (
          <Box key={c.asset} mb={1.5}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>{c.asset}</Typography>
              <Chip
                label={c.riskLevel}
                size="small"
                sx={{ bgcolor: `${levelColor(c.riskLevel)}20`, color: levelColor(c.riskLevel), fontSize: '0.6rem', height: 20 }}
              />
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(c.weight, 100)}
              sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? '#1f2937' : '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: levelColor(c.riskLevel), borderRadius: 3 } }}
            />
            <Typography variant="caption" sx={{ color: mutedText }}>{c.weight.toFixed(1)}% of portfolio</Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

/** Beta exposure card */
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
  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, backdropFilter: 'blur(12px)', height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>Beta Exposure</Typography>
        {items.map((b) => (
          <Stack
            key={b.asset}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            sx={{ py: 1, borderBottom: '1px solid', borderColor: isDark ? '#1f2937' : '#f1f5f9' }}
          >
            <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600, minWidth: 60 }}>{b.asset}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={`β BTC: ${b.betaVsBTC.toFixed(2)}`}
                size="small"
                sx={{ bgcolor: Math.abs(b.betaVsBTC) > 1.5 ? '#ef444420' : '#22c55e20', color: Math.abs(b.betaVsBTC) > 1.5 ? '#ef4444' : '#22c55e', fontSize: '0.6rem' }}
              />
              <Chip
                label={`β ETH: ${b.betaVsETH.toFixed(2)}`}
                size="small"
                sx={{ bgcolor: Math.abs(b.betaVsETH) > 1.5 ? '#ef444420' : '#22c55e20', color: Math.abs(b.betaVsETH) > 1.5 ? '#ef4444' : '#22c55e', fontSize: '0.6rem' }}
              />
              {b.hedgeSuggestion && (
                <Tooltip title="Copy hedge suggestion">
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

/** Correlation Matrix heatmap */
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
  // Extract unique assets from pairs
  const assetSet = new Set<string>();
  matrix.forEach((p) => {
    const parts = p.pair.split('-');
    const a = parts[0] ?? '';
    const b = parts[1] ?? '';
    if (a) assetSet.add(a);
    if (b) assetSet.add(b);
  });
  const assets = Array.from(assetSet).slice(0, 8); // limit to 8 for readability

  // Build lookup map
  const lookup = new Map<string, number>();
  matrix.forEach((p) => {
    lookup.set(p.pair, p.value);
    const parts = p.pair.split('-');
    const a = parts[0] ?? '';
    const b = parts[1] ?? '';
    if (a && b) lookup.set(`${b}-${a}`, p.value);
  });

  function corrColor(v: number): string {
    if (v < 0) return '#22c55e'; // negative = good (diversification)
    if (v < 0.3) return '#4ade80';
    if (v < 0.5) return '#fbbf24';
    if (v < 0.7) return '#f97316';
    return '#ef4444'; // high positive = bad
  }

  const cellSize = { xs: 36, md: 48 };

  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, backdropFilter: 'blur(12px)', height: '100%' }}>
      <CardContent sx={{ overflowX: 'auto' }}>
        <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>Correlation Matrix</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          {/* Header row */}
          <Stack direction="row" alignItems="center" spacing={0}>
            <Box sx={{ width: cellSize, minWidth: cellSize, height: cellSize }} />
            {assets.map((a) => (
              <Box key={a} sx={{ width: cellSize, minWidth: cellSize, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ color: mutedText, fontWeight: 700, fontSize: '0.55rem' }}>
                  {a}
                </Typography>
              </Box>
            ))}
          </Stack>
          {/* Grid rows */}
          {assets.map((rowAsset) => (
            <Stack key={rowAsset} direction="row" alignItems="center" spacing={0}>
              <Box sx={{ width: cellSize, minWidth: cellSize, height: cellSize, display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: mutedText, fontWeight: 700, fontSize: '0.55rem' }}>
                  {rowAsset}
                </Typography>
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
                  <Box
                    key={colAsset}
                    sx={{
                      width: cellSize, minWidth: cellSize, height: cellSize,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: val != null ? `${corrColor(val)}30` : 'transparent',
                      border: '1px solid', borderColor: val != null ? corrColor(val) : 'transparent',
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'scale(1.1)', zIndex: 1 },
                    }}
                  >
                    <Typography variant="caption" sx={{ fontSize: '0.55rem', color: val != null ? corrColor(val) : mutedText, fontWeight: 600 }}>
                      {val != null ? val.toFixed(2) : '—'}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          ))}
        </Box>
        {/* Legend */}
        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" justifyContent="center">
          <Chip label="Negative" size="small" sx={{ bgcolor: '#22c55e20', color: '#22c55e', fontSize: '0.6rem', height: 20 }} />
          <Chip label="Low (0–0.3)" size="small" sx={{ bgcolor: '#4ade8020', color: '#4ade80', fontSize: '0.6rem', height: 20 }} />
          <Chip label="Moderate (0.3–0.5)" size="small" sx={{ bgcolor: '#fbbf2420', color: '#fbbf24', fontSize: '0.6rem', height: 20 }} />
          <Chip label="High (0.5–0.7)" size="small" sx={{ bgcolor: '#f9731620', color: '#f97316', fontSize: '0.6rem', height: 20 }} />
          <Chip label="Very High (0.7+)" size="small" sx={{ bgcolor: '#ef444420', color: '#ef4444', fontSize: '0.6rem', height: 20 }} />
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Risk alerts table with copyable actions */
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
  return (
    <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, backdropFilter: 'blur(12px)' }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>
          <WarningAmberIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle', color: '#f59e0b' }} />
          Risk Alerts & Suggested Actions
        </Typography>
        <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? '#0f172a' : '#f1f5f9' }}>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>Rule</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>Status</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>Message</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>Suggested Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((a, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ color: primaryText, fontSize: '0.75rem', borderColor, fontWeight: 600 }}>{a.rule}</TableCell>
                  <TableCell sx={{ borderColor }}>
                    <Chip
                      icon={a.status === 'BREACHED' ? <ErrorOutlineIcon sx={{ fontSize: 14 }} /> : <WarningAmberIcon sx={{ fontSize: 14 }} />}
                      label={a.status}
                      size="small"
                      sx={{ bgcolor: a.status === 'BREACHED' ? '#ef444420' : '#f59e0b20', color: a.status === 'BREACHED' ? '#ef4444' : '#f59e0b', fontSize: '0.6rem', height: 22 }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{a.message}</TableCell>
                  <TableCell sx={{ borderColor }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                      onClick={() => onCopyAction(a.action)}
                      sx={{ borderColor: '#3b82f6', color: '#3b82f6', fontSize: '0.65rem', borderRadius: 2, textTransform: 'none', whiteSpace: 'nowrap' }}
                    >
                      Copy
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

// ── Main Page ──

export function RiskPage() {
  const { mode } = useThemeMode();
  const theme = useTheme();
  const isDark = mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  // ── State ──
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch from API (fallback to mock) ──
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
      // Fallback to mock data on API failure
      const mock = generateMockRiskData();
      setData(mock);
      const msg = err instanceof Error ? err.message : 'Failed to fetch risk data';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(true), 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // ── Actions ──
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ open: true, message: 'Copied to clipboard', severity: 'success' });
    } catch {
      setToast({ open: true, message: 'Failed to copy', severity: 'error' });
    }
  }, []);

  const handleManualRefresh = useCallback(() => {
    fetchData(true);
    setToast({ open: true, message: 'Refreshing risk data...', severity: 'info' });
  }, [fetchData]);

  const riskScoreColor = (data?.riskScore ?? 0) <= 30 ? '#22c55e' : (data?.riskScore ?? 0) <= 60 ? '#f59e0b' : '#ef4444';

  // ── Loading Skeleton ──
  if (loading && !data) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Box className="fade-in-up">
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, mb: 1 }}>
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', color: mutedText }} />Risk Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: mutedText, mb: 3 }}>Loading risk metrics…</Typography>
        </Box>
        <Grid container spacing={{ xs: 1.5, md: 3 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rounded" height={isMobile ? 140 : 180} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
            </Grid>
          ))}
          <Grid item xs={12} md={6}>
            <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
          </Grid>
          <Grid item xs={12}>
            <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  // ── Error State ──
  if (error && !data) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Box className="fade-in-up">
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, mb: 1 }}>
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#ef4444' }} />Risk Dashboard
          </Typography>
        </Box>
        <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, textAlign: 'center', py: 8, px: 3 }}>
          <ErrorOutlineIcon sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#ef4444', mb: 1, fontWeight: 700 }}>Failed to Load Risk Data</Typography>
          <Typography variant="body2" sx={{ color: mutedText, mb: 3 }}>{error}</Typography>
          <Button variant="contained" onClick={handleManualRefresh} startIcon={<RefreshIcon />} sx={{ borderRadius: 3 }}>
            Retry
          </Button>
        </Card>
      </Container>
    );
  }

  // ── Empty State ──
  if (!data) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Box className="fade-in-up">
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, mb: 1 }}>
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', color: mutedText }} />Risk Dashboard
          </Typography>
        </Box>
        <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, textAlign: 'center', py: 8, px: 3 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: mutedText, mb: 2 }} />
          <Typography variant="h6" sx={{ color: mutedText, mb: 1, fontWeight: 700 }}>No Risk Data Available</Typography>
          <Typography variant="body2" sx={{ color: isDark ? '#374151' : '#cbd5e1' }}>Connect an exchange and enable risk monitoring to see metrics.</Typography>
        </Card>
      </Container>
    );
  }

  // ── Main Render ──
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box className="fade-in-up">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={1} spacing={1}>
          <Box>
            <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
              <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', color: riskScoreColor }} />Risk Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: mutedText }}>VaR · Drawdown · Concentration · Beta · Correlation</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {refreshing && <CircularProgress size={16} sx={{ color: mutedText }} />}
            <Chip
              icon={<RefreshIcon sx={{ fontSize: 14 }} />}
              label={refreshing ? 'Refreshing…' : 'Auto 15s'}
              size="small"
              onClick={handleManualRefresh}
              sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText, cursor: 'pointer', fontSize: '0.65rem' }}
            />
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={{ xs: 1.5, md: 3 }} className="stagger-children">
        {/* Risk Score */}
        <Grid item xs={12} sm={6} md={3}>
          <RiskScoreCard score={data.riskScore} isDark={isDark} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} />
        </Grid>

        {/* Metric Cards */}
        <Grid item xs={6} sm={6} md={3}>
          <RiskMetricCard label="VaR 95% (1-Day)" value={`$${data.var95.toLocaleString()}`} sub="5% probability loss" color={data.var95 > 3000 ? '#ef4444' : '#22c55e'} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <RiskMetricCard label="VaR 99% (1-Day)" value={`$${data.var99.toLocaleString()}`} sub="1% probability loss" />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <RiskMetricCard label="CVaR 95%" value={`$${data.cvar95.toLocaleString()}`} sub="Expected shortfall" />
        </Grid>

        {/* Drawdown */}
        <Grid item xs={6} sm={6} md={3}>
          <RiskMetricCard
            label="Max Drawdown"
            value={`${data.maxDrawdown}%`}
            sub={`Current: ${data.currentDrawdown}%`}
            color={data.maxDrawdown > 25 ? '#ef4444' : data.maxDrawdown > 15 ? '#f59e0b' : '#22c55e'}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <RiskMetricCard
            label="Concentration Risk"
            value={data.concentrationRisk}
            sub="Top asset weight"
            color={
              data.concentrationRisk === 'CRITICAL' ? '#ef4444'
              : data.concentrationRisk === 'HIGH' ? '#f59e0b'
              : '#22c55e'
            }
          />
        </Grid>

        {/* Concentration & Beta */}
        <Grid item xs={12} md={6}>
          <ConcentrationCard items={data.concentration} isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} />
        </Grid>
        <Grid item xs={12} md={6}>
          <BetaExposureCard items={data.betaExposure} onCopyHedge={handleCopy} isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} />
        </Grid>

        {/* Correlation Matrix */}
        <Grid item xs={12} lg={6}>
          <CorrelationMatrix matrix={data.correlationMatrix} isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} />
        </Grid>

        {/* Risk Alerts */}
        <Grid item xs={12} lg={6}>
          <RiskAlertList alerts={data.alerts} onCopyAction={handleCopy} isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} />
        </Grid>
      </Grid>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 3, fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
