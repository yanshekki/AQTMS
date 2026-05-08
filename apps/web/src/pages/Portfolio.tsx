// ── Portfolio Detail Page ──

import { usePortfolio } from '@/features/portfolio/model/usePortfolio';
import { PortfolioSummary } from '@/features/portfolio/ui/PortfolioSummary';
import { PositionTable } from '@/features/portfolio/ui/PositionTable';

// ... other existing imports and components

export function PortfolioPage() {
  const { summary, positions, isLoading, error, refresh } = usePortfolio();

  if (isLoading && !summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
          <Button onClick={refresh} sx={{ ml: 2 }}>重試</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={800}>
          Portfolio Dashboard
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} disabled={isLoading}>
          刷新
        </Button>
      </Box>

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
