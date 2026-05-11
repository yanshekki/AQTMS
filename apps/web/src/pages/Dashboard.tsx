// ── Enhanced Dashboard with Real-time WS + Kill Switch UI ──

import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress, Button, Alert
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
}

export default function Dashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [livePositions, setLivePositions] = useState<Position[]>([]);
  const [livePnL, setLivePnL] = useState(0);
  const [killSwitchStatus, setKillSwitchStatus] = useState<{ active: boolean; reason?: string }>({ active: false });
  const [realtimeUpdates, setRealtimeUpdates] = useState<any[]>([]);
  const [isTogglingKillSwitch, setIsTogglingKillSwitch] = useState(false);

  // Fetch portfolio summary
  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: async () => {
      const res = await axios.get('/api/portfolio/summary', { withCredentials: true });
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Fetch recent snapshots for chart history
  const { data: snapshots } = useQuery({
    queryKey: ['portfolio-snapshots'],
    queryFn: async () => {
      const res = await axios.get('/api/portfolio/snapshots?limit=20', { withCredentials: true });
      return res.data;
    },
  });

  // WebSocket real-time connection
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001/trading';
    const newSocket = io(wsUrl, {
      withCredentials: true,
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      newSocket.emit('auth', { userId: 'demo-user-id' });
    });

    newSocket.on('position:update', (data: any) => {
      if (data.positions) setLivePositions(data.positions);
      if (data.totalValue) setLivePnL(data.totalValue);
      refetch();
    });

    newSocket.on('killswitch:status', (status: { active: boolean; reason?: string }) => {
      setKillSwitchStatus(status);
    });

    newSocket.on('order:update', (order: any) => {
      setRealtimeUpdates(prev => [{ type: 'order', ...order }, ...prev].slice(0, 10));
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [refetch]);

  // Kill Switch toggle handler
  const toggleKillSwitch = async () => {
    setIsTogglingKillSwitch(true);
    try {
      const newStatus = !killSwitchStatus.active;
      await axios.post('/api/safety/kill-switch', { active: newStatus }, { withCredentials: true });
      setKillSwitchStatus({ active: newStatus, reason: newStatus ? 'Manual activation from Dashboard' : undefined });
    } catch (err) {
      console.error('Failed to toggle Kill Switch', err);
      alert('Failed to toggle Kill Switch. Check backend SafetyModule.');
    } finally {
      setIsTogglingKillSwitch(false);
    }
  };

  // Chart data
  const chartData = snapshots?.map((s: any) => ({
    time: new Date(s.timestamp).toLocaleTimeString(),
    value: s.totalValue,
  })) || [];

  const pieData = livePositions.length > 0 
    ? livePositions.map((p, i) => ({ name: p.symbol, value: Math.abs(p.quantity * p.currentPrice) })) 
    : [{ name: 'No positions', value: 100 }];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (isLoading) return <Box sx={{ p: 3 }}><LinearProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📊 Trading Dashboard
        {killSwitchStatus.active && <Chip label="⛔ KILL SWITCH ACTIVE" color="error" sx={{ ml: 2 }} />}
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Total Portfolio Value</Typography>
              <Typography variant="h4">${(summary?.totalValue || 0).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Unrealized PnL</Typography>
              <Typography variant="h4" color={(summary?.totalUnrealizedPnl || 0) >= 0 ? 'success.main' : 'error.main'}>
                ${(summary?.totalUnrealizedPnl || 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Risk Exposure</Typography>
              <Typography variant="h4">{summary?.totalRiskExposure || 0}%</Typography>
              <LinearProgress variant="determinate" value={summary?.totalRiskExposure || 0} color="warning" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Positions</Typography>
              <Typography variant="h4">{summary?.positionCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Kill Switch Control + Real-time */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: killSwitchStatus.active ? 'error.light' : 'success.light' }}>
            <CardContent>
              <Typography variant="h6">Kill Switch Control</Typography>
              <Button
                variant="contained"
                color={killSwitchStatus.active ? 'error' : 'success'}
                onClick={toggleKillSwitch}
                disabled={isTogglingKillSwitch}
                sx={{ mt: 1 }}
              >
                {killSwitchStatus.active ? 'DEACTIVATE KILL SWITCH' : 'ACTIVATE KILL SWITCH'}
              </Button>
              {killSwitchStatus.active && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Trading is currently disabled. Reason: {killSwitchStatus.reason || 'Manual'}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">⚡ Real-time Updates</Typography>
              <Box sx={{ maxHeight: 180, overflow: 'auto' }}>
                {realtimeUpdates.length === 0 ? (
                  <Typography color="textSecondary">Waiting for live WebSocket data...</Typography>
                ) : realtimeUpdates.map((u, i) => (
                  <Chip key={i} label={`${u.type || 'update'}: ${JSON.stringify(u).slice(0, 60)}...`} size="small" sx={{ m: 0.5 }} />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6">Portfolio Value History</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData.length > 0 ? chartData : [{ time: 'now', value: summary?.totalValue || 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Position Allocation</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Live Positions Table */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6">Current Positions (Live via WS)</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Avg Price</TableCell>
                  <TableCell align="right">Current Price</TableCell>
                  <TableCell align="right">Unrealized PnL</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {livePositions.length > 0 ? livePositions.map((pos, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{pos.symbol}</TableCell>
                    <TableCell align="right">{pos.quantity}</TableCell>
                    <TableCell align="right">${pos.avgPrice}</TableCell>
                    <TableCell align="right">${pos.currentPrice}</TableCell>
                    <TableCell align="right" sx={{ color: (pos.pnl || 0) >= 0 ? 'green' : 'red' }}>
                      ${(pos.pnl || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>No live positions. Place trades or wait for WS updates.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
        Real-time powered by NestJS WebSocketGateway + BullMQ. Kill Switch integrated with backend SafetyModule.
      </Typography>
    </Box>
  );
}
