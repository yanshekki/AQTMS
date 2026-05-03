// ── Backtest Page (Responsive + Theme-aware) ──

import { useState } from 'react';
import {
  Container, Typography, Grid, Button, TextField, Card, CardContent,
  Stack, Slider, Alert, CircularProgress, Box, Divider, useTheme, useMediaQuery,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { safePost } from '@/shared/api';
import { z } from 'zod';
import { useThemeMode } from '@/app/Providers';
import { TradingViewChart } from '@/features/chart';
import type { ChartCandle, ChartMarker, TimeFrame } from '@/features/chart';

const BacktestResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(), symbol: z.string(), totalReturn: z.number(), totalPnL: z.number(),
    totalTrades: z.number(), winningTrades: z.number(), losingTrades: z.number(),
    winRate: z.number(), avgWin: z.number(), avgLoss: z.number(), profitFactor: z.number(),
    maxDrawdown: z.number(), sharpeRatio: z.number(), sortinoRatio: z.number(), calmarRatio: z.number(),
    totalFees: z.number(),
    equityCurve: z.array(z.object({ time: z.number(), value: z.number() })),
    drawdownCurve: z.array(z.object({ time: z.number(), drawdown: z.number() })),
    trades: z.array(z.object({ timestamp: z.string(), side: z.string(), quantity: z.number(), price: z.number(), pnl: z.number().nullable(), reason: z.string() })),
  }),
  timestamp: z.string(),
});
type BacktestResult = z.infer<typeof BacktestResponseSchema>['data'];

export function BacktestPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-04-01');
  const [capital, setCapital] = useState(10000);
  const [feeRate, setFeeRate] = useState(0.1);
  const [slippage, setSlippage] = useState(0.05);
  const [fastPeriod, setFastPeriod] = useState(9);
  const [slowPeriod, setSlowPeriod] = useState(21);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chart state
  const [chartData, setChartData] = useState<ChartCandle[]>([]);
  const [chartMarkers, setChartMarkers] = useState<ChartMarker[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<TimeFrame>('1H');

  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const cardBgAlt = isDark ? '#0f172a' : '#ffffff';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';
  const inputStyles = { input: { color: primaryText }, label: { color: mutedText }, '.MuiOutlinedInput-notchedOutline': { borderColor } };

  const runBacktest = async () => {
    setRunning(true); setError(null);
    try {
      const response = await safePost('/api/v1/backtest/run', {
        symbol, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(),
        initialCapital: capital, feeRate: feeRate / 100, slippagePercent: slippage,
        strategyType: 'SIMPLE_MA_CROSS', strategyConfig: { fastPeriod, slowPeriod, positionSize: 1 }, exchange: 'BINANCE',
      }, BacktestResponseSchema);
      setResult(response.data);

      // Fetch klines for chart display
      try {
        const binanceBase = 'https://api.binance.com';
        const klineRes = await fetch(`${binanceBase}/api/v3/klines?symbol=${symbol}&interval=1h&limit=200`);
        const klineData = (await klineRes.json()) as Array<Array<string | number>>;
        const candles: ChartCandle[] = klineData.map((row) => ({
          time: Math.floor((row[0] as number) / 1000),
          open: parseFloat(String(row[1])),
          high: parseFloat(String(row[2])),
          low: parseFloat(String(row[3])),
          close: parseFloat(String(row[4])),
          volume: parseFloat(String(row[5])),
        }));
        setChartData(candles);

        // Convert backtest trades to markers
        const markers: ChartMarker[] = response.data.trades.map((t) => ({
          time: Math.floor(new Date(t.timestamp).getTime() / 1000),
          position: t.side === 'BUY' ? 'belowBar' : 'aboveBar',
          color: t.side === 'BUY' ? '#22c55e' : '#ef4444',
          shape: t.side === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: t.side === 'BUY' ? 'BUY' : 'SELL',
          size: 2,
        }));
        setChartMarkers(markers);
      } catch {
        // Chart data fetch is non-critical — keep backtest results
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Backtest failed'); }
    finally { setRunning(false); }
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, mb: 1, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          Backtesting Engine
        </Typography>
        <Typography variant="body2" sx={{ color: mutedText, mb: { xs: 2, md: 4 }, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
          Test trading strategies against historical Binance data. Fetching real 1h klines via public API.
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Left panel — Parameters */}
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: cardBg, backdropFilter: 'blur(12px)', border: 1, borderColor, borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="subtitle2" sx={{ color: mutedText, mb: 2, fontWeight: 700 }}>Strategy Parameters</Typography>
              <Stack spacing={2}>
                <TextField label="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} size="small" sx={inputStyles} />
                <TextField label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} sx={inputStyles} />
                <TextField label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} sx={inputStyles} />
                <TextField label="Initial Capital ($)" type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))} size="small" sx={inputStyles} />
                <Typography variant="caption" sx={{ color: mutedText }}>Fee: {feeRate}%</Typography>
                <Slider value={feeRate} onChange={(_, v) => setFeeRate(v as number)} min={0} max={1} step={0.01} sx={{ color: '#3b82f6' }} />
                <Typography variant="caption" sx={{ color: mutedText }}>Slippage: {slippage}%</Typography>
                <Slider value={slippage} onChange={(_, v) => setSlippage(v as number)} min={0} max={1} step={0.01} sx={{ color: '#3b82f6' }} />
                <Divider sx={{ borderColor }} />
                <Typography variant="subtitle2" sx={{ color: mutedText, fontWeight: 700 }}>MA Cross Strategy</Typography>
                <Stack direction="row" spacing={2}>
                  <TextField label="Fast MA" type="number" value={fastPeriod} onChange={(e) => setFastPeriod(Number(e.target.value))} size="small" sx={inputStyles} />
                  <TextField label="Slow MA" type="number" value={slowPeriod} onChange={(e) => setSlowPeriod(Number(e.target.value))} size="small" sx={inputStyles} />
                </Stack>
                <Button variant="contained" fullWidth startIcon={running ? <CircularProgress size={16} /> : <PlayArrowIcon />} onClick={runBacktest} disabled={running}
                  sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 3, fontWeight: 700, '&:hover': { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', transform: 'translateY(-1px)', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' } }}>
                  {running ? 'Running...' : 'Run Backtest'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right panel — Results */}
        <Grid item xs={12} md={8}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          {result ? (
            <>
              <Grid container spacing={1.5} mb={2}>
                {[
                  { label: 'Total Return', value: `${result.totalReturn}%`, color: result.totalReturn >= 0 ? '#22c55e' : '#ef4444' },
                  { label: 'Win Rate', value: `${result.winRate}%`, color: result.winRate >= 50 ? '#22c55e' : '#f59e0b' },
                  { label: 'Sharpe', value: result.sharpeRatio.toFixed(2), color: result.sharpeRatio >= 1 ? '#22c55e' : '#f59e0b' },
                  { label: 'Max DD', value: `${result.maxDrawdown}%`, color: result.maxDrawdown <= 20 ? '#22c55e' : '#ef4444' },
                  { label: 'Profit Factor', value: result.profitFactor === Infinity ? '∞' : result.profitFactor.toFixed(2), color: '#3b82f6' },
                  { label: 'Trades', value: result.totalTrades.toString(), color: mutedText },
                ].map((m) => (
                  <Grid item xs={6} sm={4} md={2} key={m.label}>
                    <Card sx={{ bgcolor: cardBgAlt, border: 1, borderColor, borderRadius: 2 }}>
                      <CardContent sx={{ p: { xs: 1, md: 1.5 }, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: mutedText, fontSize: { xs: '0.6rem', md: '0.7rem' } }}>{m.label}</Typography>
                        <Typography variant="h6" sx={{ color: m.color, fontWeight: 800, mt: 0.5, fontSize: { xs: '0.9rem', md: '1.1rem' } }}>{m.value}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* TradingView Candlestick Chart */}
              {chartData.length > 0 && (
                <Card sx={{ bgcolor: cardBgAlt, border: 1, borderColor, mb: 2, borderRadius: 3 }}>
                  <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2" sx={{ color: mutedText, fontWeight: 700 }}>
                        {symbol} — {chartTimeframe}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        {(['1H', '4H', '1D'] as TimeFrame[]).map((tf) => (
                          <Chip
                            key={tf}
                            label={tf}
                            size="small"
                            onClick={() => setChartTimeframe(tf)}
                            sx={{
                              bgcolor: chartTimeframe === tf ? (isDark ? 'rgba(0,240,255,0.15)' : 'rgba(37,99,235,0.1)') : 'transparent',
                              color: chartTimeframe === tf ? '#00f0ff' : mutedText,
                              fontWeight: chartTimeframe === tf ? 700 : 400,
                            }}
                          />
                        ))}
                      </Stack>
                    </Stack>
                    <TradingViewChart
                      symbol={symbol}
                      timeframe={chartTimeframe}
                      height={400}
                      showVolume
                      data={chartData}
                      markers={chartMarkers}
                    />
                  </CardContent>
                </Card>
              )}

              <Card sx={{ bgcolor: cardBgAlt, border: 1, borderColor, mb: 2, borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                  <Typography variant="subtitle2" sx={{ color: mutedText, mb: 1, fontWeight: 700 }}>Equity Curve</Typography>
                  <ResponsiveContainer width="100%" height={isMobile ? 150 : 200}>
                    <LineChart data={result.equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                      <XAxis dataKey="time" tick={false} />
                      <YAxis stroke={mutedText} fontSize={11} />
                      <Tooltip labelFormatter={(t) => new Date(t as number).toLocaleString()} formatter={(v) => [`$${Number(v).toFixed(2)}`]} />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card sx={{ bgcolor: cardBgAlt, border: 1, borderColor, mb: 2, borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                  <Typography variant="subtitle2" sx={{ color: mutedText, mb: 1, fontWeight: 700 }}>Drawdown</Typography>
                  <ResponsiveContainer width="100%" height={isMobile ? 120 : 150}>
                    <LineChart data={result.drawdownCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                      <XAxis dataKey="time" tick={false} />
                      <YAxis stroke={mutedText} fontSize={11} domain={[0, 'auto']} reversed />
                      <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Drawdown']} />
                      <Line type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef444420" dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <TableContainer component={Paper} sx={{ bgcolor: cardBgAlt, border: 1, borderColor, borderRadius: 3, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>Time</TableCell>
                      <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>Side</TableCell>
                      <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>Price</TableCell>
                      <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>PnL</TableCell>
                      <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor, display: { xs: 'none', sm: 'table-cell' } }}>Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.trades.slice(-20).reverse().map((t, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{new Date(t.timestamp).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ color: t.side === 'BUY' ? '#22c55e' : '#ef4444', fontSize: '0.7rem', borderColor, fontWeight: 600 }}>{t.side}</TableCell>
                        <TableCell sx={{ color: primaryText, fontSize: '0.7rem', borderColor }}>${t.price.toFixed(2)}</TableCell>
                        <TableCell sx={{ color: (t.pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444', fontSize: '0.7rem', borderColor, fontWeight: 600 }}>{t.pnl !== null ? `$${t.pnl.toFixed(2)}` : '—'}</TableCell>
                        <TableCell sx={{ color: mutedText, fontSize: '0.65rem', borderColor, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>{t.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: { xs: 6, md: 12 }, bgcolor: cardBg, borderRadius: 3, border: 1, borderColor }}>
              <Typography sx={{ color: mutedText, fontSize: { xs: '0.9rem', md: '1rem' } }}>Configure parameters and click "Run Backtest" to start.</Typography>
              <Typography variant="caption" sx={{ color: isDark ? '#374151' : '#cbd5e1', display: 'block', mt: 1 }}>Uses Binance public API — no API key required.</Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
