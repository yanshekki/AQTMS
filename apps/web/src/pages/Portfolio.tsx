// ── Portfolio Detail Page (Phase B) ──
// Asset allocation pie, top holdings table, performance chart, P&L ranking
// Theme-aware · Responsive · Loading/Error/Empty states · Toast feedback

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Typography, Grid, Card, CardContent, Chip, Box, Stack,
  Button, ButtonGroup, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Skeleton, Alert, Snackbar, IconButton,
} from '@mui/material';
import PieChartIcon from '@mui/icons-material/PieChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useThemeMode } from '@/app/Providers';
import { portfolioApi } from '@/shared/api/portfolioApi';

// ── Types ──

interface Holding {
  asset: string;
  value: number;
  allocation?: number;
  pnl: number;
  pnlPercent?: number;
  color?: string;
  // legacy aliases
  allocationPct?: number;
  pnlPct?: number;
}

interface PortfolioSummary {
  totalValue: number;
  todayPnL?: number;
  todayPnLPercent?: number;
  mtdReturn?: number;
  ytdReturn?: number;
  realizedPnL?: number;
  unrealizedPnL?: number;
  // legacy field aliases for UI compatibility
  todayPnl?: number;
  todayPnlPct?: number;
  mtdPnlPct?: number;
  ytdPnlPct?: number;
}

interface AllocationItem {
  name: string;
  value: number;
  color: string;
  pct: number;
}

interface PerformancePoint {
  date: string;
  value: number;
}

type Period = '30d' | '90d' | '1y';

// ── Mock Data ──

const MOCK_SUMMARY: PortfolioSummary = {
  totalValue: 128_450.75,
  todayPnL: 2_340.50,
  todayPnLPercent: 1.86,
  mtdReturn: 12.5,
  ytdReturn: 45.2,
  realizedPnL: 4_250,
  unrealizedPnL: 1_890,
};

const MOCK_HOLDINGS: Holding[] = [
  { asset: 'BTC', value: 38_500, allocation: 30.0, pnl: 5_200, pnlPercent: 15.6, color: '#f59e0b' },
  { asset: 'ETH', value: 25_700, allocation: 20.0, pnl: -1_200, pnlPercent: -4.5, color: '#3b82f6' },
  { asset: 'USDT', value: 22_000, allocation: 17.1, pnl: 0, pnlPercent: 0, color: '#22c55e' },
  { asset: 'SOL', value: 15_300, allocation: 11.9, pnl: 3_800, pnlPercent: 33.1, color: '#8b5cf6' },
  { asset: 'BNB', value: 10_200, allocation: 7.9, pnl: 560, pnlPercent: 5.8, color: '#f97316' },
  { asset: 'MATIC', value: 6_450, allocation: 5.0, pnl: -890, pnlPercent: -12.1, color: '#ec4899' },
  { asset: 'LINK', value: 5_800, allocation: 4.5, pnl: 420, pnlPercent: 7.8, color: '#06b6d4' },
  { asset: 'AVAX', value: 4_500, allocation: 3.5, pnl: -310, pnlPercent: -6.4, color: '#ef4444' },
];

function generatePerformanceData(period: Period): PerformancePoint[] {
  const now = new Date();
  const points = period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const interval = period === '30d' ? 1 : period === '90d' ? 1 : 1;
  const data: PerformancePoint[] = [];
  let value = 100_000;
  for (let i = points; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * interval);
    const change = (Math.random() - 0.48) * 2_500;
    value = Math.max(80_000, Math.min(150_000, value + change));
    data.push({
      date: d.toISOString().slice(0, 10),
      value: Math.round(value * 100) / 100,
    });
  }
  return data;
}

// ── Sub-components ──

interface AssetAllocationPieProps {
  holdings: Holding[];
  isDark: boolean;
  selectedAsset: string | null;
  onSelect: (asset: string | null) => void;
}

function AssetAllocationPie({ holdings, isDark, selectedAsset, onSelect }: AssetAllocationPieProps) {
  const data: AllocationItem[] = holdings.map((h) => ({
    name: h.asset,
    value: h.value,
    color: h.color ?? '#3b82f6',
    pct: h.allocation ?? 0,
  }));

  const handleClick = (entry: AllocationItem | null) => {
    if (!entry) { onSelect(null); return; }
    onSelect(selectedAsset === entry.name ? null : entry.name);
  };

  return (
    <Box sx={{ width: '100%', height: 320, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            cursor="pointer"
            onClick={(e) => handleClick(e as unknown as AllocationItem | null)}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? '#3b82f6'}
                opacity={selectedAsset && selectedAsset !== entry.name ? 0.35 : 1}
                stroke={isDark ? '#030712' : '#f8fafc'}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <RechartsTooltip
            contentStyle={{
              background: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
              border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
              borderRadius: 12,
              color: isDark ? '#f3f4f6' : '#0f172a',
            }}
            formatter={(value: unknown, name: unknown) => [`$${(value as number).toLocaleString()}`, String(name)]}
          />
          <Legend
            formatter={(value: string) => (
              <span style={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      {selectedAsset && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            color: isDark ? '#9ca3af' : '#64748b', cursor: 'pointer',
          }}
          onClick={() => onSelect(null)}
        >
          Click to clear filter
        </Typography>
      )}
    </Box>
  );
}

interface TopHoldingsTableProps {
  holdings: Holding[];
  isDark: boolean;
  mutedText: string;
  primaryText: string;
  borderColor: string;
}

function TopHoldingsTable({ holdings, mutedText, primaryText, borderColor }: TopHoldingsTableProps) {
  const headerSx = { color: mutedText, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' as const, borderColor };
  const cellSx = { color: primaryText, fontWeight: 600, borderColor, py: 1.5 };

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headerSx}>Asset</TableCell>
            <TableCell sx={{ ...headerSx, textAlign: 'right' }}>Value</TableCell>
            <TableCell sx={{ ...headerSx, textAlign: 'right' }}>Alloc%</TableCell>
            <TableCell sx={{ ...headerSx, textAlign: 'right' }}>P&L</TableCell>
            <TableCell sx={{ ...headerSx, textAlign: 'right' }}>P&L%</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {holdings.map((h) => (
            <TableRow key={h.asset} hover>
              <TableCell sx={{ ...cellSx, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: h.color ?? '#3b82f6', flexShrink: 0 }} />
                {h.asset}
              </TableCell>
              <TableCell sx={{ ...cellSx, textAlign: 'right' }}>${h.value.toLocaleString()}</TableCell>
              <TableCell sx={{ ...cellSx, textAlign: 'right' }}>{(h.allocation ?? 0).toFixed(1)}%</TableCell>
              <TableCell sx={{ textAlign: 'right', color: h.pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600, borderColor, py: 1.5 }}>
                {h.pnl >= 0 ? '+' : ''}${h.pnl.toLocaleString()}
              </TableCell>
              <TableCell sx={{ textAlign: 'right', color: (h.pnlPercent ?? 0) >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600, borderColor, py: 1.5 }}>
                {(h.pnlPercent ?? 0) >= 0 ? '+' : ''}{(h.pnlPercent ?? 0).toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

interface PerformanceChartProps {
  data: PerformancePoint[];
  period: Period;
  onPeriodChange: (p: Period) => void;
  isDark: boolean;
  loading: boolean;
}

function PerformanceChart({ data, period, onPeriodChange, isDark, loading }: PerformanceChartProps) {
  const periods: Period[] = ['30d', '90d', '1y'];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="subtitle2" sx={{ color: isDark ? '#9ca3af' : '#64748b', fontWeight: 700 }}>
          Historical Performance
        </Typography>
        <ButtonGroup size="small">
          {periods.map((p) => (
            <Button
              key={p}
              variant={period === p ? 'contained' : 'outlined'}
              onClick={() => onPeriodChange(p)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                ...(period === p
                  ? { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }
                  : { borderColor: isDark ? '#374151' : '#cbd5e1', color: isDark ? '#9ca3af' : '#64748b' }),
              }}
            >
              {p}
            </Button>
          ))}
        </ButtonGroup>
      </Stack>

      {loading ? (
        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
      ) : (
        <Box sx={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: isDark ? '#6b7280' : '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: isDark ? '#374151' : '#e2e8f0' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: isDark ? '#6b7280' : '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                domain={['dataMin - 5000', 'dataMax + 5000']}
              />
              <RechartsTooltip
                contentStyle={{
                  background: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
                  border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                  borderRadius: 12,
                  color: isDark ? '#f3f4f6' : '#0f172a',
                  fontWeight: 600,
                }}
                formatter={(value: unknown) => [`$${(value as number).toLocaleString()}`, 'Portfolio Value']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#portfolioGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: isDark ? '#030712' : '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}

// ── Main Page ──

export function PortfolioPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
  const [period, setPeriod] = useState<Period>('30d');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false, message: '', severity: 'info',
  });

  const showToast = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  // Initial data fetch from API (with mock fallback)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, holdingsRes, perfRes] = await Promise.all([
        portfolioApi.getSummary().catch(() => ({ success: true as const, data: MOCK_SUMMARY, timestamp: '' })),
        portfolioApi.getHoldings().catch(() => ({ success: true as const, data: MOCK_HOLDINGS, timestamp: '' })),
        portfolioApi.getPerformance(period).catch(() => ({ success: true as const, data: generatePerformanceData(period), timestamp: '' })),
      ]);
      setSummary(summaryRes.data);
      setHoldings(holdingsRes.data);
      setPerformanceData(perfRes.data);
    } catch {
      setError('Failed to load portfolio data. Please try again.');
      showToast('Failed to load portfolio data', 'error');
    } finally {
      setLoading(false);
    }
  }, [period, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Period change — fetch from API with mock fallback
  const handlePeriodChange = useCallback(async (p: Period) => {
    setPeriod(p);
    setChartLoading(true);
    try {
      const perfRes = await portfolioApi.getPerformance(p).catch(() => ({
        success: true as const, data: generatePerformanceData(p), timestamp: '',
      }));
      setPerformanceData(perfRes.data);
      showToast(`Showing ${p} performance data`, 'info');
    } catch {
      showToast('Failed to load performance data', 'error');
    } finally {
      setChartLoading(false);
    }
  }, [showToast]);

  // Filtered holdings
  const filteredHoldings = useMemo(() => {
    if (!selectedAsset) return holdings;
    return holdings.filter((h) => h.asset === selectedAsset);
  }, [holdings, selectedAsset]);

  // P&L ranking
  const rankedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => b.pnl - a.pnl);
  }, [holdings]);

  // ── Loading State ──
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Grid container spacing={{ xs: 1.5, md: 3 }}>
          {[12, 6, 6, 12, 6, 12].map((w, i) => (
            <Grid item xs={12} sm={w === 6 ? 6 : 12} md={w === 12 ? 6 : (w === 6 ? 3 : 12)} key={i}>
              <Skeleton variant="rounded" height={w === 12 ? 320 : 140} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  // ── Error State ──
  if (error || !summary) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error || 'No portfolio data available.'}</Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 3, fontWeight: 700 }}
          >
            Retry
          </Button>
        </Card>
      </Container>
    );
  }

  // ── Empty State ──
  if (holdings.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Box className="fade-in-up">
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800 }}>
            <PieChartIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#3b82f6' }} />Portfolio
          </Typography>
        </Box>
        <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, p: 6, textAlign: 'center', mt: 3 }}>
          <PieChartIcon sx={{ fontSize: 64, color: mutedText, mb: 2 }} />
          <Typography variant="h6" sx={{ color: primaryText, fontWeight: 700, mb: 1 }}>No portfolio data yet</Typography>
          <Typography variant="body2" sx={{ color: mutedText, mb: 3 }}>Connect an exchange or add assets to get started.</Typography>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box className="fade-in-up">
        <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          <PieChartIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#3b82f6' }} />Portfolio
        </Typography>
        <Typography variant="body2" sx={{ color: mutedText, mb: { xs: 2, md: 4 } }}>
          Asset allocation · Performance analysis · P&L breakdown
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 1.5, md: 3 }} className="stagger-children">
        {/* Total Value Card */}
        <Grid item xs={12} sm={6}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="caption" sx={{ color: mutedText, textTransform: 'uppercase', fontWeight: 600 }}>
                Total Portfolio Value
              </Typography>
              <Typography variant="h3" sx={{
                color: primaryText, fontWeight: 900, mt: 1,
                fontSize: { xs: '1.75rem', md: '2.5rem' },
              }}>
                ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Stack direction="row" spacing={1} mt={1} alignItems="center" flexWrap="wrap">
                <Chip
                  icon={(summary.todayPnL ?? 0) >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                  label={`Today ${(summary.todayPnL ?? 0) >= 0 ? '+' : ''}$${(summary.todayPnL ?? 0).toLocaleString()} (${(summary.todayPnLPercent ?? 0) >= 0 ? '+' : ''}${(summary.todayPnLPercent ?? 0).toFixed(2)}%)`}
                  size="small"
                  sx={{
                    bgcolor: (summary.todayPnL ?? 0) >= 0 ? '#22c55e20' : '#ef444420',
                    color: (summary.todayPnL ?? 0) >= 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 700,
                  }}
                />
                <Chip label={`MTD +${(summary.mtdReturn ?? 0).toFixed(1)}%`} size="small" sx={{ bgcolor: '#22c55e20', color: '#22c55e', fontWeight: 700 }} />
                <Chip label={`YTD +${(summary.ytdReturn ?? 0).toFixed(1)}%`} size="small" sx={{ bgcolor: '#3b82f620', color: '#3b82f6', fontWeight: 700 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* P&L Cards */}
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 }, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: mutedText, textTransform: 'uppercase', fontWeight: 600 }}>
                Realized P&L
              </Typography>
              <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 800, mt: 0.5 }}>
                +$${(summary.realizedPnL ?? 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 }, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: mutedText, textTransform: 'uppercase', fontWeight: 600 }}>
                Unrealized P&L
              </Typography>
              <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 800, mt: 0.5 }}>
                +$${(summary.unrealizedPnL ?? 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Asset Allocation Pie */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>
                Asset Allocation {selectedAsset && `— Filtered: ${selectedAsset}`}
              </Typography>
              <AssetAllocationPie
                holdings={holdings}
                isDark={isDark}
                selectedAsset={selectedAsset}
                onSelect={setSelectedAsset}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Top 5 Holdings Table */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>
                Top Holdings
              </Typography>
              <TopHoldingsTable
                holdings={selectedAsset ? filteredHoldings : holdings.slice(0, 5)}
                isDark={isDark}
                mutedText={mutedText}
                primaryText={primaryText}
                borderColor={borderColor}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Chart */}
        <Grid item xs={12} md={7}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
            <CardContent>
              <PerformanceChart
                data={performanceData}
                period={period}
                onPeriodChange={handlePeriodChange}
                isDark={isDark}
                loading={chartLoading}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* P&L Ranking */}
        <Grid item xs={12} md={5}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>
                P&L Ranking
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: mutedText, fontWeight: 700, fontSize: '0.7rem', borderColor, py: 1 }}>#</TableCell>
                      <TableCell sx={{ color: mutedText, fontWeight: 700, fontSize: '0.7rem', borderColor, py: 1 }}>Asset</TableCell>
                      <TableCell sx={{ color: mutedText, fontWeight: 700, fontSize: '0.7rem', borderColor, py: 1, textAlign: 'right' }}>P&L%</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rankedHoldings.map((h, i) => (
                      <TableRow key={h.asset} hover>
                        <TableCell sx={{ color: mutedText, fontWeight: 600, borderColor, py: 1.5, width: 40 }}>
                          {i + 1}
                        </TableCell>
                        <TableCell sx={{ color: primaryText, fontWeight: 600, borderColor, py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: h.color ?? '#3b82f6' }} />
                            {h.asset}
                          </Box>
                        </TableCell>
                        <TableCell sx={{
                          textAlign: 'right', fontWeight: 700, borderColor, py: 1.5,
                          color: (h.pnlPercent ?? 0) >= 0 ? '#22c55e' : '#ef4444',
                        }}>
                          {(h.pnlPercent ?? 0) >= 0 ? '+' : ''}{(h.pnlPercent ?? 0).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Toast / Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 3, fontWeight: 600 }}
          action={
            <IconButton size="small" color="inherit" onClick={() => setToast((prev) => ({ ...prev, open: false }))}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
