// ── Complete Dashboard with Real-time Updates ──

import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress
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

interface PortfolioSummary {
  totalValue: number;
  totalUnrealizedPnl: number;
  totalRiskExposure: number;
  positionCount: number;
  alerts: any[];
  lastUpdated: string;
}

interface Snapshot {
  id: string;
  totalValue: number;
  positions: Position[];
  timestamp: string;
}

export default function Dashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [livePositions, setLivePositions] = useState<Position[]>([]);
  const [livePnL, setLivePnL] = useState(0);
  const [killSwitchStatus, setKillSwitchStatus] = useState<{ active: boolean; reason?: string }>({ active: false });
  const [realtimeUpdates, setRealtimeUpdates] = useState<any[]>([]);

  // Fetch portfolio summary
  const { data: summary, isLoading, refetch } = useQuery<PortfolioSummary>({
    queryKey: ['portfolio-summary'],
    queryFn: async () => {
      const res = await axios.get('/api/portfolio/summary', { withCredentials: true });
      return res.data;
    },
    refetchInterval: 30000, // fallback poll
  });

  // Fetch recent snapshots for chart history
  const { data: snapshots } = useQuery<Snapshot[]>({
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
      console.log('WebSocket connected to trading namespace');
      // Auth with demo user (in real app use JWT from login)
      newSocket.emit('auth', { userId: 'demo-user-id' });
    });

    // Listen for real-time updates from backend
    newSocket.on('position:update', (data: any) => {
      console.log('Received position update:', data);
      if (data.type === 'snapshot') {
        setLivePnL(data.totalValue || 0);
        setRealtimeUpdates(prev => [data, ...prev].slice(0, 10));
      } else if (data.positions) {
        setLivePositions(data.positions);
      }
      refetch(); // refresh summary
    });

    newSocket.on('order:update', (order: any) => {
      console.log('Order update:', order);
      setRealtimeUpdates(prev => [{ type: 'order', ...order }, ...prev].slice(0, 10));
    });

    newSocket.on('killswitch:status', (status: { active: boolean; reason?: string }) => {
      setKillSwitchStatus(status);
    });

    newSocket.on('order:partial-fill', (fill: any) => {
      setRealtimeUpdates(prev => [{ type: 'partial-fill', ...fill }, ...prev].slice(0, 10));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [refetch]);

  // Prepare chart data from snapshots
  const chartData = snapshots?.map((s, index) => ({
    time: new Date(s.timestamp).toLocaleTimeString(),
    value: s.totalValue,
    pnl: s.positions?.reduce((sum: number, p: any) => sum + (p.pnl || 0), 0) || 0,
  })) || [];

  // Pie data for positions
  const pieData = (livePositions.length > 0 ? livePositions : summary ? [] : []).map((p, index) => ({
    name: p.symbol,
    value: Math.abs(p.quantity * p.currentPrice),
  }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (isLoading) {
    return <Box sx={{ p: 3 }}><LinearProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📊 Trading Dashboard
        {killSwitchStatus.active && (
          <Chip label="⛔ KILL SWITCH ACTIVE" color="error" sx={{ ml: 2 }} />
        )}
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Portfolio Value</Typography>
              <Typography variant="h4">${(summary?.totalValue || 0).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Unrealized PnL</Typography>
              <Typography variant="h4" color={ (summary?.totalUnrealizedPnl || 0) >= 0 ? 'success.main' : 'error.main' }>
                ${ (summary?.totalUnrealizedPnl || 0).toFixed(2) }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Risk Exposure</Typography>
              <Typography variant="h4">{summary?.totalRiskExposure || 0}%</Typography>
              <LinearProgress variant="determinate" value={summary?.totalRiskExposure || 0} color="warning" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Positions</Typography>
              <Typography variant="h4">{summary?.positionCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Real-time Status */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>⚡ Real-time Updates</Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {realtimeUpdates.length === 0 ? (
                  <Typography color="textSecondary">Waiting for live data from WebSocket...</Typography>
                ) : (
                  realtimeUpdates.map((update, i) => (
                    <Chip key={i} label={`${update.type || 'update'}: ${JSON.stringify(update).slice(0, 80)}...`} sx={{ m: 0.5 }} size="small" />
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: killSwitchStatus.active ? 'error.light' : 'success.light' }}>
            <CardContent>
              <Typography variant="h6">Kill Switch Status</Typography>
              <Chip 
                label={killSwitchStatus.active ? `ACTIVE: ${killSwitchStatus.reason || 'Manual'}` : 'NORMAL'} 
                color={killSwitchStatus.active ? 'error' : 'success'} 
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Portfolio Value History (from Snapshots)</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.length > 0 ? chartData : [{time: 'now', value: summary?.totalValue || 0}]}>
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
              <Typography variant="h6" gutterBottom>Position Allocation</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData.length > 0 ? pieData : [{name: 'No positions', value: 100}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {(pieData.length > 0 ? pieData : [{name: 'No positions', value: 100}]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Positions Table */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Current Positions (Live)</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Avg Price</TableCell>
                  <TableCell align="right">Current Price</TableCell>
                  <TableCell align="right">Unrealized PnL</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(livePositions.length > 0 ? livePositions : []).map((pos, index) => (
                  <TableRow key={index}>
                    <TableCell>{pos.symbol}</TableCell>
                    <TableCell align="right">{pos.quantity}</TableCell>
                    <TableCell align="right">${pos.avgPrice}</TableCell>
                    <TableCell align="right">${pos.currentPrice}</TableCell>
                    <TableCell align="right" sx={{ color: pos.pnl >= 0 ? 'green' : 'red' }}>
                      ${pos.pnl?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {(livePositions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>
                      No live positions. Connect WebSocket or place trades to see updates.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
        Real-time powered by NestJS WebSocketGateway + BullMQ snapshots. Data refreshes automatically.
      </Typography>
    </Box>
  );
}
