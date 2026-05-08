// ── Portfolio Detail Page ──
// ... (existing imports remain)

import { PortfolioSummary } from '@/features/portfolio/ui/PortfolioSummary';

// ... existing interfaces and components (AssetAllocationPie, TopHoldingsTable, PerformanceChart, etc.)

export function PortfolioPage() {
  // ... existing state and logic

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          <PieChartIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#3b82f6' }} />{t('portfolio.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: mutedText, mb: { xs: 2, md: 4 } }}>
          {t('portfolio.subtitle')}
        </Typography>
      </Box>

      {/* 使用新的 PortfolioSummary 元件 */}
      {summary && (
        <Box mb={4}>
          <PortfolioSummary
            totalValue={summary.totalValue}
            totalUnrealizedPnl={summary.unrealizedPnL ?? 0}
            totalRiskExposure={42} // TODO: 之後從後端計算
            positionCount={holdings.length}
          />
        </Box>
      )}

      <Grid container spacing={{ xs: 1.5, md: 3 }} className="stagger-children">
        {/* 保留原有的 Asset Allocation + Top Holdings + Performance Chart 等 */}
        {/* ... existing Grid items ... */}
      </Grid>

      {/* ... existing Snackbar ... */}
    </Container>
  );
}
