// ── Signals Table (Improved) ──

import { memo } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SignalRow } from './SignalRow';
import { useThemeMode } from '@/app/Providers';
import type { AISignal } from '../lib/types';

interface SignalsTableProps { signals: AISignal[]; isLoading: boolean; error: string | null; onSelectSignal: (id: string) => void; }

export const SignalsTable = memo(function SignalsTable({ signals, isLoading, error, onSelectSignal }: SignalsTableProps) {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';

  if (isLoading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: '#3b82f6' }} />;</Box>;
  if (error) return <Box py={4} textAlign="center"><Typography sx={{ color: '#ef4444' }}>{t('common.error')}: {error}</Typography></Box>;
  if (signals.length === 0) return (
    <Box sx={{ textAlign: 'center', py: 8, bgcolor: cardBg, borderRadius: 3, border: 1, borderColor }}>
      <Typography variant="h6" sx={{ color: mutedText, mb: 1 }}>{t('aiSignals.noSignals')}</Typography>
      <Typography variant="body2" sx={{ color: isDark ? '#374151' : '#cbd5e1' }}>{t('aiSignals.noSignalsHint')}</Typography>
    </Box>
  );

  return (
    <TableContainer component={Paper} sx={{ bgcolor: 'transparent', border: 1, borderColor, borderRadius: 3, overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: isDark ? '#0f172a' : '#f1f5f9' }}>
            <TableCell sx={{ color: mutedText, fontWeight: 600, fontSize: '0.7rem', borderColor, display: { xs: 'none', sm: 'table-cell' } }}>{t('aiSignals.tableHeaders.time')}</TableCell>
            <TableCell sx={{ color: mutedText, fontWeight: 600, fontSize: '0.7rem', borderColor }}>{t('aiSignals.tableHeaders.source')}</TableCell>
            <TableCell sx={{ color: mutedText, fontWeight: 600, fontSize: '0.7rem', borderColor }}>{t('aiSignals.tableHeaders.content')}</TableCell>
            <TableCell align="center" sx={{ color: mutedText, fontWeight: 600, fontSize: '0.7rem', borderColor }}>{t('aiSignals.tableHeaders.action') || 'Action'}</TableCell>
            <TableCell align="center" sx={{ color: mutedText, fontWeight: 600, fontSize: '0.7rem', borderColor }}>{t('aiSignals.tableHeaders.score')}</TableCell>
            <TableCell sx={{ color: mutedText, fontWeight: 600, fontSize: '0.7rem', borderColor, display: { xs: 'none', lg: 'table-cell' } }}>{t('aiSignals.tableHeaders.tsr')}</TableCell>
            <TableCell sx={{ color: mutedText, fontWeight: 600, fontSize: '0.7rem', borderColor, textAlign: 'right' }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {signals.map((signal) => <SignalRow key={signal.id} signal={signal} onSelect={onSelectSignal} />)}
        </TableBody>
      </Table>
    </TableContainer>
  );
});
