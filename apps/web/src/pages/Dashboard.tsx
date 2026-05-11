// Professional Trading Terminal with TradingView Lightweight Charts - Phase B

import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, Alert, LinearProgress,
  TextField, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

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

  // ... (keep other queries the same as previous version)

  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: async () => {
      const res = await axios.get('/api/portfolio/summary');
      setLastUpdated(new Date());
      return res.data;
    },
    refetchInterval: 15000,
  });

  const { data: positions = [], isLoading: isLoadingPositions, refetch: refetchPositions } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const res = await axios.get('/api/portfolio/positions');
      setLastUpdated(new Date());
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: priceData = [] } = useQuery({
    queryKey: ['price-history', orderForm.symbol],
    queryFn: async () => {
      const res = await axios.get(`/api/market-data/price-history?symbol=${orderForm.symbol}&limit=200`);
      return res.data || [];
    },
    refetchInterval: 8000,
  });

  const { data: currentPrice } = useQuery({
    queryKey: ['price', orderForm.symbol],
    queryFn: async () => {
      const res = await axios.get(`/api/market-data/price?symbol=${orderForm.symbol}`);
      return res.data.price;
    },
    refetchInterval: 4000,
  });

  const { data: depthData = [] } = useQuery({
    queryKey: ['depth', orderForm.symbol],
    queryFn: async () => {
      const res = await axios.get(`/api/market-data/depth?symbol=${orderForm.symbol}`);
      return res.data || [];
    },
    refetchInterval: 6000,
  });

  // Initialize TradingView Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current || priceData.length === 0) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: '#1e1e1e' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 0, // Normal crosshair
      },
      timeScale: {
        borderColor: '#485c7b',
      },
    });

    const lineSeries = chart.addLineSeries({
      color: '#00bcd4',
      lineWidth: 2,
      // crosshairMarkerVisible: true,
    });

    // Format data for TradingView (time as number or string, value)
    const formattedData = priceData.map((item: any) => ({
      time: item.time, // Assuming API returns time in a format Lightweight Charts accepts (e.g. 'YYYY-MM-DD' or unix timestamp)
      value: item.price,
    }));

    lineSeries.setData(formattedData);

    chartRef.current = chart;
    lineSeriesRef.current = lineSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.resize(
          chartContainerRef.current.clientWidth,
          320
        );
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [priceData, orderForm.symbol]);

  // Update chart with new price in real-time
  useEffect(() => {
    if (lineSeriesRef.current && currentPrice && priceData.length > 0) {
      const lastTime = priceData[priceData.length - 1]?.time;
      if (lastTime) {
        // Add or update the latest point
        lineSeriesRef.current.update({
          time: lastTime,
          value: currentPrice,
        });
      }
    }
  }, [currentPrice, priceData]);

  // ... (keep placeOrder, handle functions, etc. the same)

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

        {/* TradingView Lightweight Charts Price Chart */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Price Chart — {orderForm.symbol} (TradingView)</Typography>
              <Box 
                ref={chartContainerRef} 
                sx={{ 
                  height: 320, 
                  width: '100%',
                  backgroundColor: '#1e1e1e',
                  borderRadius: 1
                }} 
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Powered by TradingView Lightweight Charts • Real-time updates
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Market Depth</Typography>
              <Box sx={{ height: 320 }}>
                {depthData.length > 0 ? (
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
                ) : (
                  <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                    <Typography color="text.secondary">No depth data available</Typography>
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
