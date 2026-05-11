import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, Grid, Chip, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, Stack, CircularProgress, Alert } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRealTimePrice } from '@/hooks/useRealTimePrice';

interface StrategyVersion {
  id: string;
  params: string;
  createdAt: string;
  performance?: {
    totalReturn: number;
    winRate: number;
    sharpe: number;
  };
}

export default function Strategies() {
  const queryClient = useQueryClient();
  const [newStrategy, setNewStrategy] = useState({ name: '', type: 'sma_crossover', params: '{}' });
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [versions, setVersions] = useState<StrategyVersion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: strategies = [], isLoading, error: strategiesError } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => (await axios.get('/api/strategies')).data,
  });

  // Real-time prices for common symbols
  const { prices: realTimePrices, isConnected } = useRealTimePrice(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);

  const createStrategy = useMutation({
    mutationFn: (data: any) => axios.post('/api/strategies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      setNewStrategy({ name: '', type: 'sma_crossover', params: '{}' });
      setError(null);
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to create strategy'),
  });

  const deployStrategy = useMutation({
    mutationFn: (strategyId: string) => axios.post(`/api/strategies/${strategyId}/deploy`, { active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });

  const runBacktestForStrategy = async (strategy: any) => {
    setIsRunningBacktest(true);
    setSelectedStrategy(strategy);
    setError(null);
    try {
      const params = JSON.parse(strategy.params || '{}');
      const res = await axios.post('/api/backtest/run', {
        strategyName: strategy.type,
        strategyParams: params,
        symbol: 'BTCUSDT',
        startDate: '2025-01-01',
        endDate: '2025-06-01',
        initialCapital: 10000,
      });
      setBacktestResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Backtest failed');
      setBacktestResult({ error: 'Backtest failed' });
    } finally {
      setIsRunningBacktest(false);
    }
  };

  const addVersion = (strategy: any) => {
    const newVersion: StrategyVersion = {
      id: `v${Date.now()}`,
      params: strategy.params || '{}',
      createdAt: new Date().toISOString(),
    };
    setVersions(prev => [...prev, newVersion]);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#0d1117', minHeight: '100vh', color: '#c9d1d9' }}>
      <Typography variant="h4" gutterBottom>Strategy Management</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {strategiesError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load strategies. Please refresh.</Alert>}

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="My Strategies" />
        <Tab label="Performance Tracking" />
      </Tabs>

      {activeTab === 0 && (
        <>
          <Card sx={{ mb: 3, backgroundColor: '#161b22', border: '1px solid #30363d' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Create New Strategy</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Strategy Name"
                    value={newStrategy.name}
                    onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    label="Type"
                    value={newStrategy.type}
                    onChange={(e) => setNewStrategy({ ...newStrategy, type: e.target.value })}
                    fullWidth
                  >
                    <option value="sma_crossover">SMA Crossover</option>
                    <option value="mean_reversion">Mean Reversion</option>
                    <option value="momentum">Momentum</option>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Params (JSON)"
                    value={newStrategy.params}
                    onChange={(e) => setNewStrategy({ ...newStrategy, params: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button variant="contained" fullWidth onClick={() => createStrategy.mutate(newStrategy)}>
                    Create
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Your Strategies</Typography>
              {strategies.length === 0 ? (
                <Typography color="text.secondary">No strategies yet.</Typography>
              ) : (
                <List>
                  {strategies.map((s: any) => (
                    <ListItem key={s.id} divider>
                      <ListItemText 
                        primary={s.name} 
                        secondary={`Type: ${s.type} | ${s.isActive ? '🟢 Active (Live)' : 'Inactive'}`} 
                      />
                      <Stack direction="row" spacing={1}>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={() => runBacktestForStrategy(s)}
                          disabled={isRunningBacktest}
                        >
                          Run Backtest
                        </Button>
                        <Button 
                          variant={s.isActive ? "outlined" : "contained"} 
                          color={s.isActive ? "warning" : "success"}
                          size="small" 
                          onClick={() => deployStrategy.mutate(s.id)}
                        >
                          {s.isActive ? 'Deactivate' : 'Deploy Live'}
                        </Button>
                        <Button 
                          variant="text" 
                          size="small" 
                          onClick={() => addVersion(s)}
                        >
                          + Version
                        </Button>
                      </Stack>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 1 && (
        <Card sx={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Performance Tracking (by Version)</Typography>
            {versions.length === 0 ? (
              <Typography color="text.secondary">No versions tracked yet. Add versions from the Strategies tab and run backtests for real performance data.</Typography>
            ) : (
              <List>
                {versions.map((v, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={`Version ${index + 1} - ${new Date(v.createdAt).toLocaleDateString()}`}
                      secondary={v.performance 
                        ? `Return: ${v.performance.totalReturn.toFixed(1)}% | Win Rate: ${v.performance.winRate.toFixed(1)}% | Sharpe: ${v.performance.sharpe.toFixed(2)}`
                        : 'Performance data pending real backtest'
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!backtestResult} onClose={() => setBacktestResult(null)} maxWidth="md" fullWidth>
        <DialogTitle>Backtest Result - {selectedStrategy?.name}</DialogTitle>
        <DialogContent>
          {backtestResult?.error ? (
            <Typography color="error">{backtestResult.error}</Typography>
          ) : backtestResult ? (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography><strong>Total Return:</strong> {backtestResult.totalReturn}%</Typography>
                <Typography><strong>Net Return:</strong> {backtestResult.netReturn}%</Typography>
                <Typography><strong>Sharpe:</strong> {backtestResult.sharpeRatio}</Typography>
                <Typography><strong>Sortino:</strong> {backtestResult.sortinoRatio}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography><strong>Win Rate:</strong> {backtestResult.winRate}%</Typography>
                <Typography><strong>Profit Factor:</strong> {backtestResult.profitFactor}</Typography>
                <Typography><strong>Max Drawdown:</strong> {backtestResult.maxDrawdown}%</Typography>
                <Typography><strong>Expectancy:</strong> {backtestResult.expectancy}</Typography>
              </Grid>
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBacktestResult(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
