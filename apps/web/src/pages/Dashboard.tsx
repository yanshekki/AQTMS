// Advanced Trading Terminal Dashboard - Phase A

import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, Alert, LinearProgress,
  TextField, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
// Assuming Recharts is available or can be added; using simple display for now if not

interface OrderForm {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
}

export default function Dashboard() {
  const queryClient = useQueryClient();

  const [currentMode, setCurrentMode] = useState<'PAPER' | 'TESTNET' | 'LIVE'>('PAPER');
  const [orderForm, setOrderForm] = useState<OrderForm>({
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'MARKET',
    quantity: 0.001,
    price: 0,
    stopLoss: 0,
    takeProfit: 0,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

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

  // Current Price
  const { data: currentPrice } = useQuery({
    queryKey: ['price', orderForm.symbol],
    queryFn: async () => {
      const res = await axios.get(`/api/market-data/price?symbol=${orderForm.symbol}`);
      return res.data.price;
    },
    refetchInterval: 5000,
  });

  // Place Order Mutation with better error handling
  const placeOrder = useMutation({
    mutationFn: (orderData: any) => axios.post('/api/execution/execute', orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setSnackbar({ open: true, message: 'Order placed successfully!', severity: 'success' });
      // Reset form partially
      setOrderForm(prev => ({ ...prev, quantity: 0.001, price: 0, stopLoss: 0, takeProfit: 0 }));
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Order failed';
      setSnackbar({ open: true, message, severity: 'error' });
    },
  });

  const handlePlaceOrder = () => {
    // Basic validation
    if (!orderForm.symbol || orderForm.quantity <= 0) {
      setSnackbar({ open: true, message: 'Please enter valid symbol and quantity', severity: 'error' });
      return;
    }

    const orderData = {
      ...orderForm,
      isPaper: currentMode === 'PAPER',
      testnet: currentMode === 'TESTNET',
      userId: 'demo-user',
      exchangeAccountId: currentMode === 'PAPER' ? 'demo-paper' : 'demo-testnet',
      price: orderForm.type === 'LIMIT' ? orderForm.price : undefined,
      stopLoss: orderForm.stopLoss > 0 ? orderForm.stopLoss : undefined,
      takeProfit: orderForm.takeProfit > 0 ? orderForm.takeProfit : undefined,
    };
    placeOrder.mutate(orderData);
  };

  const handleInputChange = (field: keyof OrderForm, value: any) => {
    setOrderForm(prev => ({ ...prev, [field]: value }));
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
          </Stack>
          {currentMode === 'LIVE' && <Alert severity="error" sx={{ mt: 1 }}>⚠️ LIVE MODE - Real funds at risk!</Alert>}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Quick Order Panel with SL/TP */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Order</Typography>

              <Stack spacing={2}>
                <TextField
                  label="Symbol"
                  value={orderForm.symbol}
                  onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                  fullWidth
                />

                <TextField
                  select
                  label="Side"
                  value={orderForm.side}
                  onChange={(e) => handleInputChange('side', e.target.value)}
                  fullWidth
                >
                  <MenuItem value="BUY">BUY</MenuItem>
                  <MenuItem value="SELL">SELL</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Type"
                  value={orderForm.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  fullWidth
                >
                  <MenuItem value="MARKET">MARKET</MenuItem>
                  <MenuItem value="LIMIT">LIMIT</MenuItem>
                </TextField>

                <TextField
                  label="Quantity"
                  type="number"
                  value={orderForm.quantity}
                  onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value))}
                  fullWidth
                  inputProps={{ step: 0.001 }}
                />

                {orderForm.type === 'LIMIT' && (
                  <TextField
                    label="Limit Price"
                    type="number"
                    value={orderForm.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                    fullWidth
                  />
                )}

                {/* Stop Loss / Take Profit */}
                <TextField
                  label="Stop Loss Price (optional)"
                  type="number"
                  value={orderForm.stopLoss}
                  onChange={(e) => handleInputChange('stopLoss', parseFloat(e.target.value))}
                  fullWidth
                  inputProps={{ step: 0.01 }}
                />
                <TextField
                  label="Take Profit Price (optional)"
                  type="number"
                  value={orderForm.takeProfit}
                  onChange={(e) => handleInputChange('takeProfit', parseFloat(e.target.value))}
                  fullWidth
                  inputProps={{ step: 0.01 }}
                />

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
                  {placeOrder.isPending ? 'Placing Order...' : `${orderForm.side} ${orderForm.symbol}`}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Positions Table */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Live Positions (Total Unrealized PnL: ${totalUnrealizedPnl.toFixed(2)})</Typography>

              <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
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
                          <TableCell align="right" sx={{ color: (pos.unrealizedPnl || 0) >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
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

        {/* Simple Price Info / Future Chart Placeholder */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Market Overview</Typography>
              <Typography variant="body1">
                Current {orderForm.symbol} Price: <strong>{currentPrice ? `$${currentPrice}` : 'Loading...'}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                (Real-time price chart integration coming in next iteration. Current price updates every 5 seconds.)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
