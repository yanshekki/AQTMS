import { Grid, Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import { useThemeMode } from '@/app/Providers';

interface PortfolioSummaryProps {
  totalValue: number;
  totalUnrealizedPnl: number;
  totalRiskExposure: number; // 0-100
  positionCount: number;
  isLoading?: boolean;
}

export function PortfolioSummary({
  totalValue,
  totalUnrealizedPnl,
  totalRiskExposure,
  positionCount,
  isLoading = false,
}: PortfolioSummaryProps) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const pnlColor = totalUnrealizedPnl >= 0 ? '#22c55e' : '#ef4444';
  const riskColor =
    totalRiskExposure > 60 ? '#ef4444' :
    totalRiskExposure > 40 ? '#f59e0b' : '#22c55e';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <Grid container spacing={2}>
      {/* Total Value */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: isDark ? '#1f2937' : '#ffffff', height: '100%' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              總資產價值
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
              {formatCurrency(totalValue)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              USDT
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Unrealized P&L */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: isDark ? '#1f2937' : '#ffffff', height: '100%' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              未實現盈虧
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ mt: 1, color: pnlColor }}
            >
              {totalUnrealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnl)}
            </Typography>
            <Typography variant="caption" sx={{ color: pnlColor }}>
              {formatPercent((totalUnrealizedPnl / totalValue) * 100)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Risk Exposure */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: isDark ? '#1f2937' : '#ffffff', height: '100%' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              風險暴露
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography variant="h5" fontWeight={800} sx={{ color: riskColor, mr: 1 }}>
                {formatPercent(totalRiskExposure)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(totalRiskExposure, 100)}
              sx={{
                mt: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: riskColor,
                },
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Position Count */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: isDark ? '#1f2937' : '#ffffff', height: '100%' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              持倉數量
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
              {positionCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              個持倉
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
