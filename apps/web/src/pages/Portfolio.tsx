// ── Portfolio Dashboard (Professional + Real-time Ready) ──

import { usePortfolio } from '@/features/portfolio/model/usePortfolio';
import { PortfolioSummary } from '@/features/portfolio/ui/PortfolioSummary';
import { PositionTable } from '@/features/portfolio/ui/PositionTable';
import { Container, Typography, Box, Button, Chip, Alert, Stack, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export function PortfolioPage() {
  const { summary, positions, isLoading, lastUpdated, refresh, error } = usePortfolio();

  const alerts = summary?.alerts || [];

  // Asset Allocation - strictly from real positions data
  const allocationData = positions.length > 0 
    ? positions.map((p: any, index: number) => ({
        name: p.symbol,
        value: Math.abs(p.quantity * (p.currentPrice || p.avgPrice || 0)),
        fill: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][index % 5]
      }))
    : [];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, backgroundColor: '#0d1117', minHeight: '100vh', color: '#c9d1d9' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Portfolio Dashboard
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              最後更新：{lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          <Chip label="實時更新中" color="success" size="small" variant="outlined" />
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} disabled={isLoading}>
            手動刷新
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load portfolio data. Please try refreshing.
        </Alert>
      )}

      {alerts.length > 0 && (
        <Stack spacing={1} mb={3}>
          {alerts.map((alert, index) => (
            <Alert 
              key={index} 
              severity={alert.severity === 'danger' ? 'error' : 'warning'}
              variant="filled"
            >
              {alert.message}
            </Alert>
          ))}
        </Stack>
      )}

      {summary && (
        <PortfolioSummary
          totalValue={summary.totalValue}
          totalUnrealizedPnl={summary.totalUnrealizedPnl}
          totalRiskExposure={summary.totalRiskExposure}
          positionCount={summary.positionCount}
          isLoading={isLoading}
        />
      )}

      {allocationData.length > 0 && (
        <Grid container spacing={3} mt={2}>
          <Grid item xs={12} md={5}>
            <Card sx={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  資產分配
                </Typography>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>
                持倉明細
              </Typography>
              <PositionTable positions={positions} isLoading={isLoading} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      )}

      {!allocationData.length && (
        <Box mt={4}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            持倉明細
          </Typography>
          <PositionTable positions={positions} isLoading={isLoading} />
        </Box>
      )}
    </Container>
  );
}
