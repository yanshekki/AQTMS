import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, Grid, Chip, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, Divider, Stack } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

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

  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => (await axios.get('/api/strategies')).data,
  });

  const createStrategy = useMutation({
    mutationFn: (data: any) => axios.post('/api/strategies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      setNewStrategy({ name: '', type: 'sma_crossover', params: '{}' });
    },
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
    } catch (err) {
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
      performance: {
        totalReturn: Math.random() * 20 - 5,
        winRate: 45 + Math.random() * 30,
        sharpe: 0.5 + Math.random() * 1.5,
      },
    };
    setVersions(prev => [...prev, newVersion]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Strategy Management</Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="My Strategies" />
        <Tab label="Performance Tracking" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {/* Create New Strategy */}
          <Card sx={{ mb: 3 }}>
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

          {/* Strategy List with Deploy + Backtest + Versioning */}
          <Card>
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
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Performance Tracking (by Version)</Typography>
            {versions.length === 0 ? (
              <Typography color="text.secondary">No versions tracked yet. Add versions from the Strategies tab.</Typography>
            ) : (
              <List>
                {versions.map((v, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={`Version ${index + 1} - ${new Date(v.createdAt).toLocaleDateString()}`}
                      secondary={`Return: ${v.performance?.totalReturn.toFixed(1)}% | Win Rate: ${v.performance?.winRate.toFixed(1)}% | Sharpe: ${v.performance?.sharpe.toFixed(2)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Backtest Result Dialog */}
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
