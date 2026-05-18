// Professional Trading Terminal - Phase A (Real-time WebSocket + Strict Real Data)

import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, Alert, LinearProgress,
  TextField, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar, CircularProgress
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { io, Socket } from 'socket.io-client';

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
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const socketRef = useRef<Socket | null>(null);

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
  const [wsConnected, setWsConnected] = useState(false);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!chartContainerRef.current || !Array.isArray(priceData) || safePriceData.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    try {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 320,
        layout: {
          background: { type: ColorType.Solid, color: "#0d1117" },
          textColor: "#c9d1d9",
        },
        grid: {
          vertLines: { color: "#21262d" },
          horzLines: { color: "#21262d" },
        },
        crosshair: { mode: 0 },
        timeScale: { borderColor: "#30363d" },
      });

      const lineSeries = chart.addLineSeries({
        color: "#58a6ff",
        lineWidth: 2,
      });

      const formattedData = priceData
        .filter((item: any) => item && item.time != null && item.price != null)
        .map((item: any) => ({ time: item.time, value: item.price }));

      lineSeries.setData(formattedData);

      chartRef.current = chart;
      lineSeriesRef.current = lineSeries;
    } catch (err) {
      console.error("Chart init failed:", err);
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.resize(chartContainerRef.current.clientWidth, 320);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [priceData, orderForm.symbol]);

  // Real-time price update on chart from query
  useEffect(() => {
    if (lineSeriesRef.current && currentPrice && safePriceData.length > 0) {
      const lastTime = priceData[safePriceData.length - 1]?.time;
      if (lastTime) {
        lineSeriesRef.current.update({ time: lastTime, value: currentPrice });
      }
    }
  }, [currentPrice, priceData]);

  const placeOrder = useMutation({
    mutationFn: (orderData: any) => axios.post('/api/execution/execute', orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setSnackbar({ open: true, message: 'Order placed successfully!', severity: 'success' });
      setOrderForm(prev => ({ ...prev, quantity: 0.001, price: 0, stopLoss: 0, takeProfit: 0 }));
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Order failed. Please check your inputs.';
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

  const hasError = summaryError || positionsError;

  if (isLoadingSummary || isLoadingPositions) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const totalUnrealizedPnl = safePositions.reduce((sum: number, p: any) => sum + (p.unrealizedPnl || 0), 0);

  return (
    <Box sx={{ p: 3, backgroundColor: '#0d1117', minHeight: '100vh', color: '#c9d1d9' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ color: '#fff' }}>Trading Terminal</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip 
            label={wsConnected ? 'WebSocket Connected' : 'Connecting...'} 
            color={wsConnected ? 'success' : 'warning'} 
            size="small" 
            variant="outlined" 
          />
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Button variant="outlined" size="small" onClick={handleManualRefresh}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Card sx={{ mb: 3, backgroundColor: '#161b22', border: '1px solid #30363d' }}>
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

      {hasError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load some data. Please try refreshing.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Order</Typography>
              <Stack spacing={2}>
                <TextField label="Symbol" value={orderForm.symbol} onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())} fullWidth sx={{ input: { color: '#fff' } }} />
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

        <Grid item xs={12} md={8}>
          <Card sx={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Live Positions (Total Unrealized PnL: ${totalUnrealizedPnl.toFixed(2)})</Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 380, backgroundColor: '#0d1117' }}>
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
                    {safePositions.length === 0 ? (
                      <TableRow><TableCell colSpan={4} align="center">No open positions</TableCell></TableRow>
                    ) : (
                      safePositions.map((pos: any) => (
                        <TableRow key={pos.symbol}>
                          <TableCell><strong>{pos.symbol}</strong></TableCell>
                          <TableCell align="right">{pos.quantity}</TableCell>
                          <TableCell align="right">${pos.avgPrice?.toFixed(2) || '-'}</TableCell>
                          <TableCell align="right" sx={{ color: (pos.unrealizedPnl || 0) >= 0 ? '#3fb950' : '#f85149', fontWeight: 600 }}>
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

        <Grid item xs={12} md={7}>
          <Card sx={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Price Chart — {orderForm.symbol}</Typography>
              <Box ref={chartContainerRef} sx={{ height: 320, width: '100%', backgroundColor: '#0d1117', borderRadius: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                TradingView Lightweight Charts • Real-time via WebSocket
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Market Depth (Real Data Only)</Typography>
              <Box sx={{ height: 320 }}>
                {safeDepthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={safeDepthData}>
                      <CartesianGrid strokeDasharray="2 2" />
                      <XAxis dataKey="price" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="bids" fill="#3fb950" name="Bids" />
                      <Bar dataKey="asks" fill="#f85149" name="Asks" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                    <Typography color="text.secondary">No real depth data available</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={4500} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
}
