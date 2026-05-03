// ── AI Signals Page (Responsive + Theme-aware) ──

import { useState } from 'react';
import { Container, Typography, Box, Stack } from '@mui/material';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import { SignalsTable } from '@/features/ai-signals/ui/SignalsTable';
import { DetailDrawer } from '@/features/ai-signals/ui/DetailDrawer';
import { useAISignals } from '@/features/ai-signals/model/useAISignals';
import { useThemeMode } from '@/app/Providers';

export function AISignalsPage() {
  const { signals, isLoading, error } = useAISignals();
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={1} spacing={1}>
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
            <AutoGraphIcon sx={{ mr: 1, verticalAlign: 'middle', color: isDark ? '#00f0ff' : '#2563eb' }} />AI Signals
          </Typography>
          <Typography variant="body2" sx={{ color: mutedText, fontSize: { xs: '0.7rem', md: '0.8rem' } }}>{signals.length} signals · 15s refresh</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: mutedText, mb: { xs: 2, md: 3 }, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>Real-time AI-scored news. Scores ≥ 80 trigger trade signals.</Typography>
      </Box>
      <SignalsTable signals={signals} isLoading={isLoading} error={error} onSelectSignal={setSelectedSignalId} />
      <DetailDrawer signalId={selectedSignalId} onClose={() => setSelectedSignalId(null)} />
    </Container>
  );
}
