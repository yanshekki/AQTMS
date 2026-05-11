// Trading Terminal Dashboard - Phase A

import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, Alert, LinearProgress,
  TextField, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export default function Dashboard() {
  const queryClient = useQueryClient();

  const [currentMode, setCurrentMode] = useState<'PAPER' | 'TESTNET' | 'LIVE'>('PAPER');
  const [orderForm, setOrderForm] = useState({
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'MARKET',
    quantity: 0.001,
    price: 0,
  });
  const [validationResult, setValidationResult] = useState<any>(null);

  // Portfolio Summary
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: async () => (await axios.get('/api/portfolio/summary')).data,
    refetchInterval: 15000,
  });

  // Live Positions
  const { data: positions = [], isLoading: isLoadingPositions } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => (await axios.get('/api/portfolio/positions')).data,
    refetchInterval: 10000,
  });

  // Current Price (simple)
  const { data: currentPrice } = useQuery({
    queryKey: ['price', orderForm.symbol],
    queryFn: async () => {
      const res = await axios.get(`/api/market-data/price?symbol=${orderForm.symbol}`);
      return res.data.price;
    },
    refetchInterval: 5000,
  });

  // Place Order Mutation
  const placeOrder = useMutation({
    mutationFn: (orderData: any) => axios.post('/api/execution/execute', orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      alert('Order placed successfully!');
    },
    onError: (error: any) => {
      alert(`Order failed: ${error.response?.data?.message || error.message}`);
    },
  });

  const handlePlaceOrder = () => {
    const orderData = {
      ...orderForm,
      isPaper: currentMode === 'PAPER',
      testnet: currentMode === 'TESTNET',
      userId: 'demo-user', // TODO: replace with real auth
      exchangeAccountId: currentMode === 'PAPER' ? 'demo-paper' : 'demo-testnet',
      price: orderForm.type === 'LIMIT' ? orderForm.price : undefined,
    };
    placeOrder.mutate(orderData);
  };

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

  if (isLoadingSummary || isLoadingPositions) return <LinearProgress />;

  const totalUnrealizedPnl = positions.reduce((sum: number, p: any) => sum + (p.unrealizedPnl || 0), 0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Trading Terminal</Typography>

      {/* Mode Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Mode:</Typography>
            <Chip label={currentMode} color={currentMode === 'PAPER' ? 'success' : currentMode === 'TESTNET' ? 'warning' : 'error'} sx={{ fontSize: '1rem', px: 2 }} />
            <Button variant="outlined" size="small" onClick={() => setCurrentMode('PAPER')}>PAPER</Button>
            <Button variant="outlined" size="small" onClick={() => setCurrentMode('TESTNET')}>TESTNET</Button>
            <Button variant="outlined" size="small" color="error" onClick={() => setCurrentMode('LIVE')}>LIVE</Button>
            <Button variant="outlined" size="small" onClick={runValidation}>Validate Env</Button>
          </Stack>
          {currentMode === 'LIVE' && <Alert severity="error" sx={{ mt: 1 }}>⚠️ LIVE MODE - Real funds at risk!</Alert>}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Quick Order Panel */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Order</Typography>

              <Stack spacing={2}>
                <TextField
                  label="Symbol"
                  value={orderForm.symbol}
                  onChange={(e) => setOrderForm({ ...orderForm, symbol: e.target.value.toUpperCase() })}
                  fullWidth
                />

                <TextField
                  select
                  label="Side"
                  value={orderForm.side}
                  onChange={(e) => setOrderForm({ ...orderForm, side: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="BUY">BUY</MenuItem>
                  <MenuItem value="SELL">SELL</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Type"
                  value={orderForm.type}
                  onChange={(e) => setOrderForm({ ...orderForm, type: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="MARKET">MARKET</MenuItem>
                  <MenuItem value="LIMIT">LIMIT</MenuItem>
                </TextField>

                <TextField
                  label="Quantity"
                  type="number"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({ ...orderForm, quantity: parseFloat(e.target.value) })}
                  fullWidth
                />

                {orderForm.type === 'LIMIT' && (
                  <TextField
                    label="Price"
                    type="number"
                    value={orderForm.price}
                    onChange={(e) => setOrderForm({ ...orderForm, price: parseFloat(e.target.value) })}
                    fullWidth
                  />
                )}

                <Typography variant="body2" color="text.secondary">
                  Current Price: {currentPrice ? `$${currentPrice}` : 'Loading...'}
                </Typography>

                <Button
                  variant="contained"
                  color={orderForm.side === 'BUY' ? 'success' : 'error'}
                  size="large"
                  onClick={handlePlaceOrder}
                  disabled={placeOrder.isPending}
                >
                  {placeOrder.isPending ? 'Placing...' : `${orderForm.side} ${orderForm.symbol}`}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Positions Table */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Live Positions (PnL: ${totalUnrealizedPnl.toFixed(2)})</Typography>

              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Avg Price</TableCell>
                      <TableCell align="right">Unrealized PnL</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {positions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No open positions</TableCell>
                      </TableRow>
                    ) : (
                      positions.map((pos: any) => (
                        <TableRow key={pos.symbol}>
                          <TableCell><strong>{pos.symbol}</strong></TableCell>
                          <TableCell align="right">{pos.quantity}</TableCell>
                          <TableCell align="right">${pos.avgPrice?.toFixed(2) || '-'}</TableCell>
                          <TableCell align="right" sx={{ color: (pos.unrealizedPnl || 0) >= 0 ? 'success.main' : 'error.main' }}>
                            ${(pos.unrealizedPnl || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Backtest (kept from before) */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>📊 Quick Backtest</Typography>
              {/* Keep simplified backtest section or link to Strategies page */}
              <Typography variant="body2" color="text.secondary">
                Use the Strategies page for full backtesting. Quick backtest available in previous version.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
