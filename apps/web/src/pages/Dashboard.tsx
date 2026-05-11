// Enhanced Dashboard with Backtesting UI and improved testing controls

import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, Alert, LinearProgress, TextField, MenuItem, Stack
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
      setValidationResult({ ready: false, issues: ['Validation request failed'] });
    }
  };

  const runBacktest = async () => {
    setIsRunningBacktest(true);
    try {
      const res = await axios.post('/api/backtest/run', backtestParams);
      setBacktestResult(res.data);
    } catch (err) {
      setBacktestResult({ error: 'Backtest failed or endpoint not available yet' });
    } finally {
      setIsRunningBacktest(false);
    }
  };

  if (isLoading) return <LinearProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Trading Dashboard
      </Typography>

      {/* Trading Mode + Testing Controls */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Current Trading Mode</Typography>
              <Box sx={{ mt: 1, mb: 2 }}>
                <Chip
                  label={currentMode}
                  color={currentMode === 'PAPER' ? 'success' : currentMode === 'TESTNET' ? 'warning' : 'error'}
                  sx={{ fontSize: '1.1rem', px: 3, py: 1.5 }}
                />
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="outlined" onClick={() => setCurrentMode('PAPER')}>PAPER</Button>
                <Button variant="outlined" onClick={() => setCurrentMode('TESTNET')}>TESTNET</Button>
                <Button variant="outlined" color="error" onClick={() => setCurrentMode('LIVE')}>LIVE</Button>
              </Stack>

              {currentMode === 'LIVE' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  ⚠️ LIVE mode active — Real money at risk!
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Testing Tools</Typography>
              <Button variant="contained" onClick={runValidation} sx={{ mt: 1 }}>
                Validate Testing Environment
              </Button>

              {validationResult && (
                <Box sx={{ mt: 2 }}>
                  {validationResult.ready ? (
                    <Alert severity="success">Ready for testing!</Alert>
                  ) : (
                    <Alert severity="warning">
                      Issues: {validationResult.issues?.join(', ')}
                    </Alert>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Backtesting UI Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>📊 Quick Backtest</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Run a quick backtest before going live (recommended in PAPER mode)
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
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
                <MenuItem value="momentum">Momentum</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Symbol"
                value={backtestParams.symbol}
                onChange={(e) => setBacktestParams({ ...backtestParams, symbol: e.target.value })}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                label="Start Date"
                type="date"
                value={backtestParams.startDate}
                onChange={(e) => setBacktestParams({ ...backtestParams, startDate: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                label="End Date"
                type="date"
                value={backtestParams.endDate}
                onChange={(e) => setBacktestParams({ ...backtestParams, endDate: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                onClick={runBacktest}
                disabled={isRunningBacktest}
                fullWidth
              >
                {isRunningBacktest ? 'Running...' : 'Run Backtest'}
              </Button>
            </Grid>
          </Grid>

          {backtestResult && (
            <Box sx={{ mt: 2 }}>
              {backtestResult.error ? (
                <Alert severity="info">{backtestResult.error}</Alert>
              ) : (
                <Alert severity="success">
                  Backtest completed! Sharpe: {backtestResult.sharpe || 'N/A'} | Return: {backtestResult.totalReturn || 'N/A'}%
                </Alert>
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
              <Typography color="textSecondary">Total Portfolio Value</Typography>
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
              <Typography color="textSecondary">Open Positions</Typography>
              <Typography variant="h4">{summary?.positionCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="caption" sx={{ mt: 3, display: 'block', color: 'text.secondary' }}>
        Tip: Use PAPER mode + Backtest first. Then move to TESTNET before small LIVE trades.
      </Typography>
    </Box>
  );
}
