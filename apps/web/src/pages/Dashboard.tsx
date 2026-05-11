// Polished Dashboard with improved testing controls and backtesting UI

import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, Alert, LinearProgress, TextField, MenuItem, Stack, Divider
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function Dashboard() {
  const [currentMode, setCurrentMode] = useState<'PAPER' | 'TESTNET' | 'LIVE'>('PAPER');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [backtestParams, setBacktestParams] = useState({
    strategy: 'sma_crossover',
    symbol: 'BTCUSDT',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  });
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: async () => {
      const res = await axios.get('/api/portfolio/summary');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const runValidation = async () => {
    try {
      const res = await axios.post('/api/execution/validate-testing', {
        userId: 'demo-user',
        exchangeAccountId: 'demo-account',
      });
      setValidationResult(res.data);
    } catch (err) {
      setValidationResult({ ready: false, issues: ['Validation failed'] });
    }
  };

  const runBacktest = async () => {
    setIsRunningBacktest(true);
    try {
      const res = await axios.post('/api/backtest/run', backtestParams);
      setBacktestResult(res.data);
    } catch (err) {
      setBacktestResult({ error: 'Backtest endpoint not fully available yet. This is a UI preview.' });
    } finally {
      setIsRunningBacktest(false);
    }
  };

  const placeQuickTestOrder = async (mode: 'PAPER' | 'TESTNET') => {
    const orderData = {
      isPaper: mode === 'PAPER',
      testnet: mode === 'TESTNET',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: 0.001,
      userId: 'demo-user',
      exchangeAccountId: mode === 'PAPER' ? 'demo-paper' : 'demo-testnet',
    };

    try {
      const res = await axios.post('/api/execution/execute', orderData);
      alert(`${mode} order placed! Result: ${JSON.stringify(res.data).slice(0, 100)}...`);
    } catch (err: any) {
      alert(`Failed to place ${mode} order: ${err.message}`);
    }
  };

  if (isLoading) return <LinearProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Trading Dashboard
      </Typography>

      {/* Mode + Testing Controls */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Trading Mode</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Chip
                  label={currentMode}
                  color={currentMode === 'PAPER' ? 'success' : currentMode === 'TESTNET' ? 'warning' : 'error'}
                  sx={{ fontSize: '1.1rem', px: 2.5, py: 1 }}
                />
                {currentMode === 'LIVE' && <Alert severity="error" sx={{ py: 0 }}>Real money active!</Alert>}
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button variant="outlined" size="small" onClick={() => setCurrentMode('PAPER')}>PAPER</Button>
                <Button variant="outlined" size="small" onClick={() => setCurrentMode('TESTNET')}>TESTNET</Button>
                <Button variant="outlined" size="small" color="error" onClick={() => setCurrentMode('LIVE')}>LIVE</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Testing Actions</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="contained" size="small" onClick={() => placeQuickTestOrder('PAPER')}>
                  Quick Paper Order
                </Button>
                <Button variant="contained" size="small" color="warning" onClick={() => placeQuickTestOrder('TESTNET')}>
                  Quick Testnet Order
                </Button>
                <Button variant="outlined" size="small" onClick={runValidation}>
                  Validate Env
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Backtesting Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>📊 Quick Backtest</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Test your strategy before going live (best in PAPER mode)
          </Typography>

          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={6} sm={3}>
              <TextField
                select
                label="Strategy"
                value={backtestParams.strategy}
                onChange={(e) => setBacktestParams({ ...backtestParams, strategy: e.target.value })}
                fullWidth
                size="small"
              >
                <MenuItem value="sma_crossover">SMA Crossover</MenuItem>
                <MenuItem value="mean_reversion">Mean Reversion</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                label="Symbol"
                value={backtestParams.symbol}
                onChange={(e) => setBacktestParams({ ...backtestParams, symbol: e.target.value })}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                label="From"
                type="date"
                value={backtestParams.startDate}
                onChange={(e) => setBacktestParams({ ...backtestParams, startDate: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                label="To"
                type="date"
                value={backtestParams.endDate}
                onChange={(e) => setBacktestParams({ ...backtestParams, endDate: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                fullWidth
                onClick={runBacktest}
                disabled={isRunningBacktest}
              >
                {isRunningBacktest ? 'Running...' : 'Run Backtest'}
              </Button>
            </Grid>
          </Grid>

          {backtestResult && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              {backtestResult.error ? (
                <Typography color="text.secondary">{backtestResult.error}</Typography>
              ) : (
                <Stack direction="row" spacing={3} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Return</Typography>
                    <Typography variant="h6" color={backtestResult.totalReturn > 0 ? 'success.main' : 'error.main'}>
                      {backtestResult.totalReturn || 'N/A'}%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Sharpe Ratio</Typography>
                    <Typography variant="h6">{backtestResult.sharpe || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Max Drawdown</Typography>
                    <Typography variant="h6" color="error.main">{backtestResult.maxDrawdown || 'N/A'}%</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Win Rate</Typography>
                    <Typography variant="h6">{backtestResult.winRate || 'N/A'}%</Typography>
                  </Box>
                </Stack>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Summary */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Total Value</Typography>
              <Typography variant="h4">${summary?.totalValue || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Unrealized PnL</Typography>
              <Typography variant="h4" color={(summary?.totalUnrealizedPnl || 0) >= 0 ? 'success.main' : 'error.main'}>
                ${summary?.totalUnrealizedPnl || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Positions</Typography>
              <Typography variant="h4">{summary?.positionCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="caption" sx={{ mt: 3, display: 'block', color: 'text.secondary' }}>
        Recommended flow: Backtest → PAPER mode → TESTNET validation → Small LIVE trades
      </Typography>
    </Box>
  );
}
