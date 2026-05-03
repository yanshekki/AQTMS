// ── Signal Row (Theme-aware + Responsive) ──

import { useState, memo } from 'react';
import { TableRow, TableCell, Typography, Chip, Stack, IconButton, Collapse, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import { ScoreBadge } from './ScoreBadge';
import { useThemeMode } from '@/app/Providers';
import type { AISignal } from '../lib/types';

interface SignalRowProps { signal: AISignal; onSelect: (id: string) => void; }

export const SignalRow = memo(function SignalRow({ signal, onSelect }: SignalRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const dimText = isDark ? '#6b7280' : '#94a3b8';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';
  const expandedBg = isDark ? '#1e293b' : '#f1f5f9';
  const score = signal.compositeScore;

  const sourceIcons: Record<string, string> = {
    TELEGRAM: t('aiSignals.sourceIcons.TELEGRAM'),
    X: t('aiSignals.sourceIcons.X'),
    ONCHAIN: t('aiSignals.sourceIcons.ONCHAIN'),
  };

  return (
    <>
      <TableRow hover onClick={() => setExpanded(!expanded)} sx={{ cursor: 'pointer', bgcolor: expanded ? expandedBg : 'inherit', borderLeft: score !== null && score >= 80 ? '3px solid #22c55e' : '3px solid transparent', '&:hover': { bgcolor: expandedBg } }}>
        <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>
          {signal.processedAt ? new Date(signal.processedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
        </TableCell>
        <TableCell sx={{ color: mutedText, borderColor, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
          {sourceIcons[signal.source] ?? '📰'} <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>{signal.source}</Box>
        </TableCell>
        <TableCell sx={{ borderColor, maxWidth: { xs: 120, md: 300 } }}>
          <Typography variant="body2" sx={{ color: primaryText, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
            {signal.content.slice(0, 150)}{signal.content.length > 150 ? '...' : ''}
          </Typography>
        </TableCell>
        <TableCell sx={{ borderColor, display: { xs: 'none', md: 'table-cell' } }}>
          {signal.isFake && <Chip label={t('aiSignals.fake')} size="small" sx={{ bgcolor: '#7f1d1d20', color: '#ef4444', fontSize: '0.65rem' }} />}
        </TableCell>
        <TableCell align="center" sx={{ borderColor }}>
          <ScoreBadge score={score} />
        </TableCell>
        <TableCell sx={{ borderColor, display: { xs: 'none', lg: 'table-cell' } }}>
          <Stack direction="row" spacing={0.5}>
            <ScoreBadge score={signal.truthScore} />
            <Box component="span" sx={{ display: { xs: 'none', xl: 'inline' } }}><ScoreBadge score={signal.sentimentScore !== null ? Math.abs(signal.sentimentScore) : null} /></Box>
            <Box component="span" sx={{ display: { xs: 'none', xl: 'inline' } }}><ScoreBadge score={signal.relevanceScore} /></Box>
          </Stack>
        </TableCell>
        <TableCell align="right" sx={{ borderColor }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSelect(signal.id); }}><OpenInNewIcon sx={{ color: dimText, fontSize: 18 }} /></IconButton>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>{expanded ? <ExpandLessIcon sx={{ color: dimText }} /> : <ExpandMoreIcon sx={{ color: dimText }} />}</IconButton>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} sx={{ bgcolor: expandedBg, borderBottom: 1, borderColor }}>
            <Collapse in={expanded}>
              <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                <Typography variant="body2" sx={{ color: primaryText, mb: 1, fontSize: { xs: '0.75rem', md: '0.85rem' } }}>{signal.content}</Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${t('aiSignals.drawer.truth')}: ${signal.truthScore ?? '?'}%`} size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText }} />
                  <Chip label={`${t('aiSignals.drawer.sentiment')}: ${signal.sentimentScore ?? '?'}`} size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText }} />
                  <Chip label={`${t('aiSignals.drawer.relevance')}: ${signal.relevanceScore ?? '?'}%`} size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText }} />
                </Stack>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
