// Professional Trading Terminal with UX Optimizations - Phase D

import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, Alert, LinearProgress,
  TextField, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';

interface OrderForm {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'TRAILING_STOP';
  quantity: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  trailingOffset: number;
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
    trailingOffset: 50,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Portfolio Summary
  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: async () => {
      const res = await axios.get('/api/portfolio/summary');
      setLastUpdated(new Date());
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Live Positions
  const { data: positions = [], isLoading: isLoadingPositions, refetch: refetchPositions } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const res = await axios.get('/api/portfolio/positions');
      setLastUpdated(new Date());
      return res.data;
    },
    refetchInterval: 10000,
  });

  // Price History
  const { data: priceData = [] } = useQuery({
    queryKey: ['price-history', orderForm.symbol],
    queryFn: async () => {
      const res = await axios.get(`/api/market-data/price-history?symbol=${orderForm.symbol}&limit=100`);
      return res.data || [];
    },
    refetchInterval: 8000,
  });

  // Current Price
  const { data: currentPrice } = useQuery({
    queryKey: ['price', orderForm.symbol],
    queryFn: async () => {
      const res = await axios.get(`/api/market-data/price?symbol=${orderForm.symbol}`);
      return res.data.price;
    },
    refetchInterval: 4000,
  });

  // Depth Data
  const { data: depthData = [] } = useQuery({
    queryKey: ['depth', orderForm.symbol],
    queryFn: async () => {
      try {
        const res = await axios.get(`/api/market-data/depth?symbol=${orderForm.symbol}`);
        return res.data || generateMockDepth(currentPrice);
      } catch {
        return generateMockDepth(currentPrice);
      }
    },
    refetchInterval: 6000,
  });

  function generateMockDepth(price: number | undefined) {
    const basePrice = price || 60000;
    return [
      { price: basePrice - 80, bids: 8, asks: 0 },
      { price: basePrice - 50, bids: 22, asks: 4 },
      { price: basePrice - 20, bids: 45, asks: 18 },
      { price: basePrice, bids: 60, asks: 35 },
      { price: basePrice + 20, bids: 25, asks: 55 },
      { price: basePrice + 50, bids: 9, asks: 48 },
      { price: basePrice + 80, bids: 3, asks: 22 },
    ];
  }

  const performanceData = [
    { time: '09:00', pnl: 120 }, { time: '10:00', pnl: 280 }, { time: '11:00', pnl: 195 },
    { time: '12:00', pnl: 420 }, { time: '13:00', pnl: 380 }, { time: '14:00', pnl: 610 },
    { time: '15:00', pnl: 540 },
  ];

  const placeOrder = useMutation({
    mutationFn: (orderData: any) => axios.post('/api/execution/execute', orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setSnackbar({ open: true, message: 'Order placed successfully!', severity: 'success' });
      setOrderForm(prev => ({ ...prev, quantity: 0.001, price: 0, stopLoss: 0, takeProfit: 0 }));
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Order failed. Please try again.';
      setSnackbar({ open: true, message, severity: 'error' });
    },
  });

  const handlePlaceOrder = () => {
    if (!orderForm.symbol || orderForm.quantity <= 0) {
      setSnackbar({ open: true, message: 'Please enter valid symbol and quantity', severity: 'error' });
      return;
    }

    const orderData: any = {
      ...orderForm,
      isPaper: currentMode === 'PAPER',
      testnet: currentMode === 'TESTNET',
      userId: 'demo-user',
      exchangeAccountId: currentMode === 'PAPER' ? 'demo-paper' : 'demo-testnet',
    };

    if (['LIMIT', 'STOP'].includes(orderForm.type)) orderData.price = orderForm.price;
    if (orderForm.stopLoss > 0) orderData.stopLoss = orderForm.stopLoss;
    if (orderForm.takeProfit > 0) orderData.takeProfit = orderForm.takeProfit;
    if (orderForm.type === 'TRAILING_STOP') orderData.trailingOffset = orderForm.trailingOffset;

    placeOrder.mutate(orderData);
  };

  const handleInputChange = (field: keyof OrderForm, value: any) => {
    setOrderForm(prev => ({ ...prev, [field]: value }));
  };

  const handleManualRefresh = () => {
    refetchSummary();
    refetchPositions();
    setLastUpdated(new Date());
  };

  if (isLoadingSummary || isLoadingPositions) return <LinearProgress />;

  const totalUnrealizedPnl = positions.reduce((sum: number, p: any) => sum + (p.unrealizedPnl || 0), 0);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Trading Terminal</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Button variant="outlined" size="small" onClick={handleManualRefresh}>
            Refresh
          </Button>
        </Stack>
      </Stack>

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
          {currentMode === 'LIVE' && <Alert severity="error" sx={{ mt: 1 }}>⚠️ LIVE MODE — Real funds at risk!</Alert>}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Quick Order Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Order</Typography>
              <Stack spacing={2}>
                <TextField label="Symbol" value={orderForm.symbol} onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())} fullWidth />
                <TextField select label="Side" value={orderForm.side} onChange={(e) => handleInputChange('side', e.target.value)} fullWidth>
                  <MenuItem value="BUY">BUY</MenuItem>
                  <MenuItem value="SELL">SELL</MenuItem>
                </TextField>
                <TextField select label="Order Type" value={orderForm.type} onChange={(e) => handleInputChange('type', e.target.value)} fullWidth>
                  <MenuItem value="MARKET">MARKET</MenuItem>
                  <MenuItem value="LIMIT">LIMIT</MenuItem>
                  <MenuItem value="STOP">STOP LOSS</MenuItem>
                  <MenuItem value="TRAILING_STOP">TRAILING STOP</MenuItem>
                </TextField>
                <TextField label="Quantity" type="number" value={orderForm.quantity} onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value))} fullWidth inputProps={{ step: 0.001 }} />
                {['LIMIT', 'STOP'].includes(orderForm.type) && (
                  <TextField label={orderForm.type === 'LIMIT' ? 'Limit Price' : 'Stop Price'} type="number" value={orderForm.price} onChange={(e) => handleInputChange('price', parseFloat(e.target.value))} fullWidth />
                )}
                {orderForm.type === 'TRAILING_STOP' && (
                  <TextField label="Trailing Offset (USD)" type="number" value={orderForm.trailingOffset} onChange={(e) => handleInputChange('trailingOffset', parseFloat(e.target.value))} fullWidth />
                )}
                <TextField label="Stop Loss (optional)" type="number" value={orderForm.stopLoss} onChange={(e) => handleInputChange('stopLoss', parseFloat(e.target.value))} fullWidth />
                <TextField label="Take Profit (optional)" type="number" value={orderForm.takeProfit} onChange={(e) => handleInputChange('takeProfit', parseFloat(e.target.value))} fullWidth />
                <Typography variant="body2" color="text.secondary">Current Price: {currentPrice ? `$${currentPrice}` : 'Loading...'}</Typography>
                <Button variant="contained" color={orderForm.side === 'BUY' ? 'success' : 'error'} size="large" onClick={handlePlaceOrder} disabled={placeOrder.isPending}>
                  {placeOrder.isPending ? 'Placing...' : `${orderForm.side} ${orderForm.symbol}`}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Positions */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Live Positions (Total Unrealized PnL: ${totalUnrealizedPnl.toFixed(2)})</Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 380 }}>
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
                      <TableRow><TableCell colSpan={4} align="center">No open positions</TableCell></TableRow>
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

        {/* Price Chart */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Price Chart — {orderForm.symbol}</Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceData}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#444" />
                    <XAxis dataKey="time" stroke="#888" />
                    <YAxis domain={['auto', 'auto']} stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: 'none' }} />
                    <Line type="monotone" dataKey="price" stroke="#00bcd4" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Market Depth */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Market Depth</Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={depthData}>
                    <CartesianGrid strokeDasharray="2 2" />
                    <XAxis dataKey="price" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="bids" fill="#4caf50" name="Bids" />
                    <Bar dataKey="asks" fill="#f44336" name="Asks" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Portfolio Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Portfolio Performance (Equity Curve)</Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="2 2" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="pnl" stroke="#66bb6a" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={4500} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
}
