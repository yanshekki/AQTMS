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
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import { portfolioApi } from '@/shared/api/portfolioApi';

interface Holding {
  asset: string;
  value: number;
  allocation?: number;
  pnl: number;
  pnlPercent?: number;
  color?: string;
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

interface AssetAllocationPieProps {
  holdings: Holding[];
  isDark: boolean;
  selectedAsset: string | null;
  onSelect: (asset: string | null) => void;
}

function AssetAllocationPie({ holdings, isDark, selectedAsset, onSelect }: AssetAllocationPieProps) {
  const { t } = useTranslation();
  const data: AllocationItem[] = holdings.map((h) => ({
    name: h.asset, value: h.value, color: h.color ?? '#3b82f6', pct: h.allocation ?? 0,
  }));

  const handleClick = (entry: AllocationItem | null) => {
    if (!entry) { onSelect(null); return; }
    onSelect(selectedAsset === entry.name ? null : entry.name);
  };

  return (
    <Box sx={{ width: '100%', height: 320, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="value"
            cursor="pointer" onClick={(e) => handleClick(e as unknown as AllocationItem | null)}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color ?? '#3b82f6'}
                opacity={selectedAsset && selectedAsset !== entry.name ? 0.35 : 1}
                stroke={isDark ? '#030712' : '#f8fafc'} strokeWidth={2} />
            ))}
          </Pie>
          <RechartsTooltip
            contentStyle={{
              background: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
              border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`, borderRadius: 12,
              color: isDark ? '#f3f4f6' : '#0f172a',
            }}
            formatter={(value: unknown, name: unknown) => [`$${(value as number).toLocaleString()}`, String(name)]}
          />
          <Legend formatter={(value: string) => (
            <span style={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12 }}>{value}</span>
          )} />
        </PieChart>
      </ResponsiveContainer>
      {selectedAsset && (
        <Typography variant="caption" sx={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          color: isDark ? '#9ca3af' : '#64748b', cursor: 'pointer',
        }} onClick={() => onSelect(null)}>
          {t('portfolio.clickToClearFilter')}
        </Typography>
      )}
    </Box>
  );
}

interface TopHoldingsTableProps {
  holdings: Holding[];
  mutedText: string;
  primaryText: string;
  borderColor: string;
}

function TopHoldingsTable({ holdings, mutedText, primaryText, borderColor }: TopHoldingsTableProps) {
  const { t } = useTranslation();
  const headerSx = { color: mutedText, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' as const, borderColor };
  const cellSx = { color: primaryText, fontWeight: 600, borderColor, py: 1.5 };

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headerSx}>{t('portfolio.tableHeaders.asset')}</TableCell>
            <TableCell sx={{ ...headerSx, textAlign: 'right' }}>{t('portfolio.tableHeaders.value')}</TableCell>
            <TableCell sx={{ ...headerSx, textAlign: 'right' }}>{t('portfolio.tableHeaders.allocPct')}</TableCell>
            <TableCell sx={{ ...headerSx, textAlign: 'right' }}>{t('portfolio.tableHeaders.pnl')}</TableCell>
            <TableCell sx={{ ...headerSx, textAlign: 'right' }}>{t('portfolio.tableHeaders.pnlPct')}</TableCell>
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
  const { t } = useTranslation();
  const periods: Period[] = ['30d', '90d', '1y'];
  const periodLabels: Record<Period, string> = {
    '30d': t('portfolio.periods.30d'),
    '90d': t('portfolio.periods.90d'),
    '1y': t('portfolio.periods.1y'),
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="subtitle2" sx={{ color: isDark ? '#9ca3af' : '#64748b', fontWeight: 700 }}>
          {t('portfolio.historicalPerformance')}
        </Typography>
        <ButtonGroup size="small">
          {periods.map((p) => (
            <Button key={p} variant={period === p ? 'contained' : 'outlined'} onClick={() => onPeriodChange(p)}
              sx={{
                textTransform: 'none', fontWeight: 600,
                ...(period === p ? { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }
                  : { borderColor: isDark ? '#374151' : '#cbd5e1', color: isDark ? '#9ca3af' : '#64748b' }),
              }}>
              {periodLabels[p]}
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
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? '#6b7280' : '#94a3b8' }} tickLine={false}
                axisLine={{ stroke: isDark ? '#374151' : '#e2e8f0' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: isDark ? '#6b7280' : '#94a3b8' }} tickLine={false} axisLine={false}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} domain={['dataMin - 5000', 'dataMax + 5000']} />
              <RechartsTooltip contentStyle={{
                background: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
                border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`, borderRadius: 12,
                color: isDark ? '#f3f4f6' : '#0f172a', fontWeight: 600,
              }} formatter={(value: unknown) => [`$${(value as number).toLocaleString()}`, t('portfolio.portfolioValue')]} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#portfolioGradient)"
                dot={false} activeDot={{ r: 5, fill: '#3b82f6', stroke: isDark ? '#030712' : '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}

export function PortfolioPage() {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

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

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [summaryRes, holdingsRes, perfRes] = await Promise.all([
        portfolioApi.getSummary(),
        portfolioApi.getHoldings(),
        portfolioApi.getPerformance(period),
      ]);
      setSummary(summaryRes.data);
      setHoldings(holdingsRes.data);
      setPerformanceData(perfRes.data);
    } catch {
      // No exchange connected — show empty state
      setSummary(null);
      setHoldings([]);
      setPerformanceData([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePeriodChange = useCallback(async (p: Period) => {
    setPeriod(p); setChartLoading(true);
    try {
      const perfRes = await portfolioApi.getPerformance(p);
      setPerformanceData(perfRes.data);
      showToast(`${t('portfolio.showingPeriod')} ${p}`, 'info');
    } catch {
      // No data for this period
      setPerformanceData([]);
    } finally { setChartLoading(false); }
  }, [showToast, t]);

  const filteredHoldings = useMemo(() => {
    if (!selectedAsset) return holdings;
    return holdings.filter((h) => h.asset === selectedAsset);
  }, [holdings, selectedAsset]);

  const rankedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => b.pnl - a.pnl);
  }, [holdings]);

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

  if (error || !summary) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error || t('portfolio.noDataAvailable')}</Alert>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchData}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 3, fontWeight: 700 }}>
            {t('common.retry')}
          </Button>
        </Card>
      </Container>
    );
  }

  if (holdings.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Box className="fade-in-up">
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800 }}>
            <PieChartIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#3b82f6' }} />{t('portfolio.title')}
          </Typography>
        </Box>
        <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, p: 6, textAlign: 'center', mt: 3 }}>
          <PieChartIcon sx={{ fontSize: 64, color: mutedText, mb: 2 }} />
          <Typography variant="h6" sx={{ color: primaryText, fontWeight: 700, mb: 1 }}>{t('portfolio.noData')}</Typography>
          <Typography variant="body2" sx={{ color: mutedText, mb: 3 }}>{t('portfolio.noDataHint')}</Typography>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          <PieChartIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#3b82f6' }} />{t('portfolio.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: mutedText, mb: { xs: 2, md: 4 } }}>
          {t('portfolio.subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 1.5, md: 3 }} className="stagger-children">
        <Grid item xs={12} sm={6}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="caption" sx={{ color: mutedText, textTransform: 'uppercase', fontWeight: 600 }}>
                {t('portfolio.totalPortfolioValue')}
              </Typography>
              <Typography variant="h3" sx={{ color: primaryText, fontWeight: 900, mt: 1, fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
                ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Stack direction="row" spacing={1} mt={1} alignItems="center" flexWrap="wrap">
                <Chip
                  icon={(summary.todayPnL ?? 0) >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                  label={`${t('portfolio.today')} ${(summary.todayPnL ?? 0) >= 0 ? '+' : ''}$${(summary.todayPnL ?? 0).toLocaleString()} (${(summary.todayPnLPercent ?? 0) >= 0 ? '+' : ''}${(summary.todayPnLPercent ?? 0).toFixed(2)}%)`}
                  size="small"
                  sx={{ bgcolor: (summary.todayPnL ?? 0) >= 0 ? '#22c55e20' : '#ef444420', color: (summary.todayPnL ?? 0) >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}
                />
                <Chip label={`MTD +${(summary.mtdReturn ?? 0).toFixed(1)}%`} size="small" sx={{ bgcolor: '#22c55e20', color: '#22c55e', fontWeight: 700 }} />
                <Chip label={`YTD +${(summary.ytdReturn ?? 0).toFixed(1)}%`} size="small" sx={{ bgcolor: '#3b82f620', color: '#3b82f6', fontWeight: 700 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 }, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: mutedText, textTransform: 'uppercase', fontWeight: 600 }}>
                {t('portfolio.realizedPnL')}
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
                {t('portfolio.unrealizedPnL')}
              </Typography>
              <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 800, mt: 0.5 }}>
                +$${(summary.unrealizedPnL ?? 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>
                {t('portfolio.assetAllocation')} {selectedAsset && `— ${t('portfolio.filtered')}: ${selectedAsset}`}
              </Typography>
              <AssetAllocationPie holdings={holdings} isDark={isDark} selectedAsset={selectedAsset} onSelect={setSelectedAsset} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>
                {t('portfolio.topHoldings')}
              </Typography>
              <TopHoldingsTable holdings={selectedAsset ? filteredHoldings : holdings.slice(0, 5)}
                mutedText={mutedText} primaryText={primaryText} borderColor={borderColor} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
            <CardContent>
              <PerformanceChart data={performanceData} period={period} onPeriodChange={handlePeriodChange}
                isDark={isDark} loading={chartLoading} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>
                {t('portfolio.pnlRanking')}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: mutedText, fontWeight: 700, fontSize: '0.7rem', borderColor, py: 1 }}>{t('portfolio.tableHeaders.rank')}</TableCell>
                      <TableCell sx={{ color: mutedText, fontWeight: 700, fontSize: '0.7rem', borderColor, py: 1 }}>{t('portfolio.tableHeaders.asset')}</TableCell>
                      <TableCell sx={{ color: mutedText, fontWeight: 700, fontSize: '0.7rem', borderColor, py: 1, textAlign: 'right' }}>{t('portfolio.tableHeaders.pnlPct')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rankedHoldings.map((h, i) => (
                      <TableRow key={h.asset} hover>
                        <TableCell sx={{ color: mutedText, fontWeight: 600, borderColor, py: 1.5, width: 40 }}>{i + 1}</TableCell>
                        <TableCell sx={{ color: primaryText, fontWeight: 600, borderColor, py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: h.color ?? '#3b82f6' }} />
                            {h.asset}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 700, borderColor, py: 1.5, color: (h.pnlPercent ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
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

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setToast((prev) => ({ ...prev, open: false }))} severity={toast.severity} variant="filled" sx={{ borderRadius: 3, fontWeight: 600 }}
          action={<IconButton size="small" color="inherit" onClick={() => setToast((prev) => ({ ...prev, open: false }))}><CloseIcon fontSize="small" /></IconButton>}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
