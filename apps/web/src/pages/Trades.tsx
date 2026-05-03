// ── Trade History Page (Phase A – Full Spec) ──

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container, Typography, Box, Stack, TextField, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress,
  Button, FormControl, InputLabel, Select, MenuItem, Drawer, IconButton,
  Divider, TablePagination, TableSortLabel, Snackbar, Alert, Skeleton,
  useMediaQuery, useTheme,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import { tradeApi } from '@/shared/api/tradeApi';

interface Trade {
  id: string;
  exchangeOrderId: string | null;
  exchange?: string;
  symbol: string;
  side: string;
  type: string;
  status: string;
  quantity: number;
  price: number | null;
  filledQuantity?: number;
  pnl: number | null;
  fee: number | null;
  feeCurrency: string | null;
  aiReason: string | null;
  riskScore: number | null;
  createdAt: string;
}

interface TradeFilters {
  exchange: string;
  symbol: string;
  side: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

type SortField = 'createdAt' | 'symbol' | 'exchange' | 'pnl' | 'quantity' | 'riskScore';
type SortDir = 'asc' | 'desc';

function exportCsv(trades: Trade[]): void {
  const headers = [
    'ID', 'Exchange Order ID', 'Exchange', 'Symbol', 'Side', 'Type', 'Status',
    'Quantity', 'Price', 'Filled Qty', 'P&L', 'Fee', 'Fee Currency', 'AI Reason', 'Risk Score', 'Created At',
  ];
  const rows = trades.map((t) => [
    t.id, t.exchangeOrderId ?? '', t.exchange ?? '', t.symbol, t.side, t.type, t.status,
    t.quantity, t.price, t.filledQuantity, t.pnl, t.fee, t.feeCurrency,
    `"${(t.aiReason ?? '').replace(/"/g, '""')}"`, t.riskScore, t.createdAt,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aqtms_trades_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatPnl(pnl: number | null): { text: string; color: string } {
  const val = pnl ?? 0;
  if (val > 0) return { text: `+$${val.toFixed(2)}`, color: '#22c55e' };
  if (val < 0) return { text: `-$${Math.abs(val).toFixed(2)}`, color: '#ef4444' };
  return { text: '$0.00', color: '#9ca3af' };
}

function TradeFiltersBar({
  filters, onChange, primaryText, mutedText, borderColor, onReset,
}: { filters: TradeFilters; onChange: (f: TradeFilters) => void; primaryText: string; mutedText: string; borderColor: string; onReset: () => void }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();
  const inputSx = {
    '& .MuiOutlinedInput-root': { color: primaryText, '& fieldset': { borderColor }, '&:hover fieldset': { borderColor: '#3b82f6' }, borderRadius: 3 },
    '& .MuiInputLabel-root': { color: mutedText },
  };
  const update = (key: keyof TradeFilters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      <TextField label={t('trades.filters.dateFrom')} type="date" size="small" value={filters.dateFrom}
        onChange={(e) => update('dateFrom', e.target.value)} sx={{ ...inputSx, minWidth: isMobile ? '100%' : 160 }} InputLabelProps={{ shrink: true }} />
      <TextField label={t('trades.filters.dateTo')} type="date" size="small" value={filters.dateTo}
        onChange={(e) => update('dateTo', e.target.value)} sx={{ ...inputSx, minWidth: isMobile ? '100%' : 160 }} InputLabelProps={{ shrink: true }} />
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 120 }}>
        <InputLabel sx={{ color: mutedText }}>{t('trades.filters.exchange')}</InputLabel>
        <Select value={filters.exchange} onChange={(e) => update('exchange', e.target.value)} label={t('trades.filters.exchange')}
          sx={{ color: primaryText, '& fieldset': { borderColor }, '&:hover fieldset': { borderColor: '#3b82f6' }, borderRadius: 3 }}>
          <MenuItem value="">{t('trades.filters.all')}</MenuItem>
          {['Binance', 'Bybit'].map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField label={t('trades.filters.symbol')} placeholder="e.g. BTC" size="small" value={filters.symbol}
        onChange={(e) => update('symbol', e.target.value)} sx={{ ...inputSx, minWidth: isMobile ? '100%' : 120 }} />
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 100 }}>
        <InputLabel sx={{ color: mutedText }}>{t('trades.filters.side')}</InputLabel>
        <Select value={filters.side} onChange={(e) => update('side', e.target.value)} label={t('trades.filters.side')}
          sx={{ color: primaryText, '& fieldset': { borderColor }, '&:hover fieldset': { borderColor: '#3b82f6' }, borderRadius: 3 }}>
          <MenuItem value="">{t('trades.filters.all')}</MenuItem>
          <MenuItem value="BUY">{t('trades.filters.buy')}</MenuItem>
          <MenuItem value="SELL">{t('trades.filters.sell')}</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 120 }}>
        <InputLabel sx={{ color: mutedText }}>{t('trades.filters.status')}</InputLabel>
        <Select value={filters.status} onChange={(e) => update('status', e.target.value)} label={t('trades.filters.status')}
          sx={{ color: primaryText, '& fieldset': { borderColor }, '&:hover fieldset': { borderColor: '#3b82f6' }, borderRadius: 3 }}>
          <MenuItem value="">{t('trades.filters.all')}</MenuItem>
          <MenuItem value="FILLED">{t('trades.filters.filled')}</MenuItem>
          <MenuItem value="PARTIALLY_FILLED">{t('trades.filters.partial')}</MenuItem>
          <MenuItem value="CANCELLED">{t('trades.filters.cancelled')}</MenuItem>
          <MenuItem value="REJECTED">{t('trades.filters.rejected')}</MenuItem>
        </Select>
      </FormControl>
      <Button size="small" variant="outlined" onClick={onReset}
        sx={{ borderColor, color: mutedText, borderRadius: 3, textTransform: 'none', minWidth: isMobile ? '100%' : 'auto' }}>
        {t('trades.resetFilters')}
      </Button>
    </Stack>
  );
}

function TradeDetailDrawer({
  trade, open, onClose, isDark, primaryText, mutedText, borderColor,
}: { trade: Trade | null; open: boolean; onClose: () => void; isDark: boolean; primaryText: string; mutedText: string; borderColor: string }) {
  const { t } = useTranslation();
  if (!trade) return null;

  const pnl = formatPnl(trade.pnl ?? 0);
  const riskScore = trade.riskScore ?? 0;
  const riskColor = riskScore >= 70 ? '#22c55e' : riskScore >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: isDark ? '#0f172a' : '#f8fafc', width: { xs: '100%', sm: 480 }, maxWidth: '100%', p: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ color: primaryText, fontWeight: 700 }}>{t('trades.drawer.title')}</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon sx={{ color: mutedText }} /></IconButton>
      </Stack>
      <Divider sx={{ borderColor, mb: 3 }} />
      <Stack spacing={2.5}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: mutedText }}>{t('trades.drawer.orderId')}</Typography>
          <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600, fontFamily: 'monospace' }}>{trade.exchangeOrderId ?? t('trades.drawer.na')}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: mutedText }}>{t('trades.drawer.exchange')}</Typography>
          <Chip label={trade.exchange ?? t('trades.drawer.unknown')} size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: primaryText }} />
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" sx={{ color: mutedText }}>{t('trades.drawer.symbol')}</Typography>
          <Typography variant="body2" sx={{ color: primaryText, fontWeight: 700, fontSize: '1.1rem' }}>{trade.symbol}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" sx={{ color: mutedText }}>{t('trades.drawer.sideType')}</Typography>
          <Stack direction="row" spacing={1}>
            <Chip icon={trade.side === 'BUY' ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
              label={trade.side === 'BUY' ? t('trades.filters.buy') : t('trades.filters.sell')}
              size="small" sx={{ bgcolor: trade.side === 'BUY' ? '#22c55e20' : '#ef444420', color: trade.side === 'BUY' ? '#22c55e' : '#ef4444', fontWeight: 700 }} />
            <Chip label={trade.type ?? 'MARKET'} size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText }} />
          </Stack>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: mutedText }}>{t('trades.drawer.quantity')}</Typography>
          <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>{trade.filledQuantity ?? trade.quantity} / {trade.quantity}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: mutedText }}>{t('trades.drawer.price')}</Typography>
          <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>${(trade.price ?? 0).toFixed(2)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: mutedText }}>{t('trades.drawer.pnl')}</Typography>
          <Typography variant="body2" sx={{ color: pnl.color, fontWeight: 700, fontSize: '1.1rem' }}>{pnl.text}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: mutedText }}>{t('trades.drawer.fee')}</Typography>
          <Typography variant="body2" sx={{ color: primaryText }}>{trade.fee ?? 0} {trade.feeCurrency ?? 'USDT'}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: mutedText }}>{t('trades.drawer.status')}</Typography>
          <Chip label={t(`trades.status.${trade.status}` as any, trade.status.replace('_', ' '))} size="small"
            sx={{ bgcolor: trade.status === 'FILLED' ? '#22c55e20' : trade.status === 'CANCELLED' ? '#ef444420' : '#f59e0b20',
              color: trade.status === 'FILLED' ? '#22c55e' : trade.status === 'CANCELLED' ? '#ef4444' : '#f59e0b', fontWeight: 600 }} />
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: mutedText }}>{t('trades.drawer.riskScore')}</Typography>
          <Chip label={`${riskScore}/100`} size="small" sx={{ bgcolor: `${riskColor}20`, color: riskColor, fontWeight: 700 }} />
        </Stack>
        <Box sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', p: 2, borderRadius: 3, border: '1px solid', borderColor }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <PsychologyIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            <Typography variant="body2" sx={{ color: '#8b5cf6', fontWeight: 700 }}>{t('trades.drawer.aiDecision')}</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: primaryText, lineHeight: 1.6 }}>{trade.aiReason ?? t('trades.drawer.noAiReason')}</Typography>
        </Box>
        <Box sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', p: 2, borderRadius: 3, border: '1px solid', borderColor }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <AssessmentIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
            <Typography variant="body2" sx={{ color: '#f59e0b', fontWeight: 700 }}>{t('trades.drawer.riskAssessment')}</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: primaryText, lineHeight: 1.6 }}>
            {riskScore >= 70 ? t('trades.drawer.riskLow') : riskScore >= 40 ? t('trades.drawer.riskModerate') : t('trades.drawer.riskHigh')}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: mutedText, textAlign: 'center', mt: 1 }}>
          {t('trades.drawer.created')}: {new Date(trade.createdAt).toLocaleString()}
        </Typography>
      </Stack>
    </Drawer>
  );
}

export function TradeHistoryPage() {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  const [trades, setTrades] = useState<Trade[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TradeFilters>({ exchange: '', symbol: '', side: '', status: '', dateFrom: '', dateTo: '' });
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    setLoading(true); setError(null);
    const params: Record<string, string | number> = { page: page + 1, limit: rowsPerPage };
    if (filters.symbol) params.symbol = filters.symbol;
    if (filters.side) params.side = filters.side;
    if (filters.status) params.status = filters.status;
    if (filters.dateFrom) params.from = filters.dateFrom;
    if (filters.dateTo) params.to = filters.dateTo;
    tradeApi.getTrades(params as any)
      .then(res => { setTrades(res.data.trades as Trade[]); setTotal(res.data.total); })
      .catch(err => setError(err instanceof Error ? err.message : t('trades.failedToLoad')))
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, filters, t]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...trades].sort((a, b) => {
      if (sortField === 'createdAt') return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      if (sortField === 'pnl') return ((a.pnl ?? 0) - (b.pnl ?? 0)) * dir;
      if (sortField === 'quantity') return (a.quantity - b.quantity) * dir;
      if (sortField === 'riskScore') return ((a.riskScore ?? 0) - (b.riskScore ?? 0)) * dir;
      return String(a[sortField as keyof Trade] ?? '').localeCompare(String(b[sortField as keyof Trade] ?? '')) * dir;
    });
  }, [trades, sortField, sortDir]);

  useEffect(() => { setPage(0); }, [filters]);

  const handleSort = (field: SortField) => {
    setSortField(prev => { if (prev === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return prev; } setSortDir('desc'); return field; });
  };
  const handleRowClick = (trade: Trade) => { setSelectedTrade(trade); setDrawerOpen(true); };
  const handleExport = useCallback(() => {
    setExporting(true);
    try { exportCsv(trades); setToast({ open: true, message: `${t('trades.toast.exportSuccess')} ${trades.length}`, severity: 'success' }); }
    catch { setToast({ open: true, message: t('trades.toast.exportFailed'), severity: 'error' }); }
    finally { setTimeout(() => setExporting(false), 800); }
  }, [trades, t]);

  const handleResetFilters = () => {
    setFilters({ exchange: '', symbol: '', side: '', status: '', dateFrom: '', dateTo: '' });
    setToast({ open: true, message: t('trades.toast.filtersReset'), severity: 'info' });
  };

  const statusChip = (status: Trade['status']) => {
    const config: Record<string, { bg: string; color: string }> = {
      FILLED: { bg: '#22c55e20', color: '#22c55e' },
      PARTIALLY_FILLED: { bg: '#3b82f620', color: '#3b82f6' },
      CANCELLED: { bg: '#ef444420', color: '#ef4444' },
      REJECTED: { bg: '#ef444420', color: '#ef4444' },
    };
    const c = config[status] ?? { bg: '#6b728020', color: '#6b7280' };
    const label = t(`trades.status.${status}` as any, status);
    return <Chip label={label} size="small" sx={{ bgcolor: c.bg, color: c.color, fontSize: '0.6rem', height: 20, fontWeight: 600 }} />;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Box className="fade-in-up">
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, mb: 1 }}>{t('trades.title')}</Typography>
          <Typography variant="body2" sx={{ color: mutedText, mb: 3 }}>{t('trades.loading')}</Typography>
        </Box>
        <Stack spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={40} sx={{ borderRadius: 2, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
          ))}
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Box className="fade-in-up">
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, mb: 1 }}>{t('trades.title')}</Typography>
        </Box>
        <Box sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, textAlign: 'center', py: 8, px: 3 }}>
          <Typography variant="h6" sx={{ color: '#ef4444', mb: 1, fontWeight: 700 }}>{t('trades.failedToLoad')}</Typography>
          <Typography variant="body2" sx={{ color: mutedText, mb: 3 }}>{error}</Typography>
          <Button variant="contained" onClick={() => window.location.reload()} startIcon={<RefreshIcon />} sx={{ borderRadius: 3 }}>
            {t('common.retry')}
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={1} spacing={1}>
          <Box>
            <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
              {t('trades.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: mutedText }}>
              {total} {total !== 1 ? t('trades.tradeCount_plural', { count: total }) : t('trades.tradeCount')} · {t('trades.subtitle').split('·')[1]?.trim() || 'Real-time records with AI context'}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={exporting ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <DownloadIcon />}
            onClick={handleExport} disabled={exporting || trades.length === 0}
            sx={{ borderRadius: 3, textTransform: 'none', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
            {exporting ? t('trades.exporting') : t('trades.exportCsv')}
          </Button>
        </Stack>
      </Box>

      <TradeFiltersBar filters={filters} onChange={setFilters} primaryText={primaryText} mutedText={mutedText} borderColor={borderColor} onReset={handleResetFilters} />

      {sorted.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, bgcolor: cardBg, borderRadius: 3, border: '1px solid', borderColor }}>
          <FilterListIcon sx={{ fontSize: 64, color: mutedText, mb: 2 }} />
          <Typography variant="h6" sx={{ color: mutedText, mb: 1, fontWeight: 700 }}>{t('trades.noTradesFound')}</Typography>
          <Typography variant="body2" sx={{ color: isDark ? '#374151' : '#cbd5e1', mb: 2 }}>
            {trades.length === 0 ? t('trades.noTradesHint') : t('trades.noTradesFilterHint')}
          </Typography>
          {trades.length > 0 && (
            <Button variant="outlined" onClick={handleResetFilters} sx={{ borderRadius: 3, borderColor: '#3b82f6', color: '#3b82f6' }}>
              {t('trades.clearFilters')}
            </Button>
          )}
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent', border: '1px solid', borderColor, borderRadius: 3, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? '#0f172a' : '#f1f5f9' }}>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor, cursor: 'pointer' }} onClick={() => handleSort('createdAt')}>
                    <TableSortLabel active={sortField === 'createdAt'} direction={sortField === 'createdAt' ? sortDir : 'desc'}>{t('trades.tableHeaders.time')}</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor, cursor: 'pointer' }} onClick={() => handleSort('exchange')}>
                    <TableSortLabel active={sortField === 'exchange'} direction={sortField === 'exchange' ? sortDir : 'asc'}>{t('trades.tableHeaders.exchange')}</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor, cursor: 'pointer' }} onClick={() => handleSort('symbol')}>
                    <TableSortLabel active={sortField === 'symbol'} direction={sortField === 'symbol' ? sortDir : 'asc'}>{t('trades.tableHeaders.symbol')}</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>{t('trades.tableHeaders.side')}</TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor, cursor: 'pointer' }} onClick={() => handleSort('quantity')}>
                    <TableSortLabel active={sortField === 'quantity'} direction={sortField === 'quantity' ? sortDir : 'desc'}>{t('trades.tableHeaders.qty')}</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>{t('trades.tableHeaders.price')}</TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor, cursor: 'pointer' }} onClick={() => handleSort('pnl')}>
                    <TableSortLabel active={sortField === 'pnl'} direction={sortField === 'pnl' ? sortDir : 'desc'}>{t('trades.tableHeaders.pnl')}</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>{t('trades.tableHeaders.fee')}</TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>{t('trades.tableHeaders.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((tr) => {
                  const pnl = formatPnl(tr.pnl);
                  return (
                    <TableRow key={tr.id} hover onClick={() => handleRowClick(tr)}
                      sx={{ cursor: 'pointer', transition: 'background 0.15s', '&:hover': { bgcolor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)' } }}>
                      <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>
                        {new Date(tr.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell sx={{ color: primaryText, fontSize: '0.75rem', borderColor }}>{tr.exchange}</TableCell>
                      <TableCell sx={{ color: primaryText, fontSize: '0.75rem', borderColor, fontWeight: 600 }}>{tr.symbol}</TableCell>
                      <TableCell sx={{ borderColor }}>
                        <Chip label={tr.side === 'BUY' ? t('trades.filters.buy') : t('trades.filters.sell')} size="small"
                          sx={{ bgcolor: tr.side === 'BUY' ? '#22c55e20' : '#ef444420', color: tr.side === 'BUY' ? '#22c55e' : '#ef4444', fontSize: '0.6rem', height: 20, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ color: primaryText, fontSize: '0.7rem', borderColor }}>{tr.filledQuantity ?? tr.quantity}</TableCell>
                      <TableCell sx={{ color: primaryText, fontSize: '0.7rem', borderColor }}>${(tr.price ?? 0).toFixed(2)}</TableCell>
                      <TableCell sx={{ color: pnl.color, fontSize: '0.7rem', borderColor, fontWeight: 600 }}>{pnl.text}</TableCell>
                      <TableCell sx={{ color: mutedText, fontSize: '0.65rem', borderColor }}>{tr.fee ?? 0} {tr.feeCurrency ?? 'USDT'}</TableCell>
                      <TableCell sx={{ borderColor }}>{statusChip(tr.status)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 15, 20, 50]}
            sx={{ color: mutedText, '.MuiTablePagination-selectIcon': { color: mutedText },
              '.MuiTablePagination-actions button': { color: mutedText },
              '.MuiTablePagination-actions button.Mui-disabled': { color: isDark ? '#374151' : '#cbd5e1' } }} />
        </>
      )}

      <TradeDetailDrawer trade={selectedTrade} open={drawerOpen} onClose={() => setDrawerOpen(false)}
        isDark={isDark} primaryText={primaryText} mutedText={mutedText} borderColor={borderColor} />

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} variant="filled" sx={{ borderRadius: 3, fontWeight: 600 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
