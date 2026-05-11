import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, Grid, Chip, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export default function Strategies() {
  const queryClient = useQueryClient();
  const [newStrategy, setNewStrategy] = useState({ name: '', type: 'sma_crossover', params: '{}' });
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);

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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Strategy Management</Typography>

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

      {/* Strategy List with Backtest */}
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
                    secondary={`Type: ${s.type}`} 
                  />
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => runBacktestForStrategy(s)}
                    disabled={isRunningBacktest}
                  >
                    Run Backtest
                  </Button>
                  <Chip label="Active" color="success" size="small" sx={{ ml: 1 }} />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

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
