// ── Portfolio Dashboard with Risk Alerts ──

import { usePortfolio } from '@/features/portfolio/model/usePortfolio';
import { PortfolioSummary } from '@/features/portfolio/ui/PortfolioSummary';
import { PositionTable } from '@/features/portfolio/ui/PositionTable';
import { Container, Typography, Box, Button, Chip, Alert, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export function PortfolioPage() {
  const { summary, positions, isLoading, lastUpdated, refresh } = usePortfolio();

  const alerts = summary?.alerts || [];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Portfolio Dashboard
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              最後更新：{lastUpdated.toLocaleTimeString()}（每 20 秒自動刷新）
            </Typography>
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          <Chip label="自動刷新中" color="success" size="small" variant="outlined" />
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} disabled={isLoading}>
            手動刷新
          </Button>
        </Box>
      </Box>

      {/* 風險警示橫幅 */}
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

      <Box mt={4}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          持倉明細
        </Typography>
        <PositionTable positions={positions} isLoading={isLoading} />
      </Box>
    </Container>
  );
}
