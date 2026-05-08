// ── Signal Row (Improved for Traders) ──

import { useState, memo } from 'react';
import { TableRow, TableCell, Typography, Chip, Stack, IconButton, Collapse, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import { ScoreBadge } from './ScoreBadge';
import { useThemeMode } from '@/app/Providers';
import type { AISignal } from '../lib/types';

interface SignalRowProps {
  signal: AISignal;
  onSelect: (id: string) => void;
}

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

  const score = signal.compositeScore ?? 0;

  // Try to extract suggestedAction from aiAnalysis if available
  let suggestedAction: string | null = null;
  let affectedAssets: string[] = [];
  try {
    if (signal.aiAnalysis) {
      const parsed = JSON.parse(signal.aiAnalysis);
      suggestedAction = parsed.suggestedAction || null;
      affectedAssets = parsed.affectedAssets || [];
    }
  } catch {
    // ignore parse error
  }

  const getActionColor = (action: string | null) => {
    if (!action) return { bg: isDark ? '#334155' : '#e2e8f0', color: mutedText };
    const upper = action.toUpperCase();
    if (upper === 'BUY') return { bg: '#166534', color: '#4ade80' };
    if (upper === 'SELL') return { bg: '#991b1b', color: '#f87171' };
    return { bg: isDark ? '#334155' : '#e2e8f0', color: mutedText };
  };

  const actionStyle = getActionColor(suggestedAction);

  const sourceLabel = {
    TELEGRAM: '📱 TG',
    X: '𝕏',
    ONCHAIN: '🔗 Onchain',
  }[signal.source] || signal.source;

  return (
    <>
      <TableRow
        hover
        onClick={() => setExpanded(!expanded)}
        sx={{
          cursor: 'pointer',
          bgcolor: expanded ? expandedBg : 'inherit',
          borderLeft: score >= 80 ? '4px solid #22c55e' : score >= 60 ? '4px solid #eab308' : '4px solid transparent',
          '&:hover': { bgcolor: expandedBg },
        }}
      >
        {/* Time */}
        <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>
          {signal.processedAt ? new Date(signal.processedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
        </TableCell>

        {/* Source */}
        <TableCell sx={{ color: mutedText, borderColor, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
          {sourceLabel}
        </TableCell>

        {/* Content */}
        <TableCell sx={{ borderColor, maxWidth: { xs: 140, md: 320 } }}>
          <Typography
            variant="body2"
            sx={{
              color: primaryText,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              fontSize: { xs: '0.7rem', md: '0.8rem' },
            }}
          >
            {signal.content.slice(0, 120)}{signal.content.length > 120 ? '...' : ''}
          </Typography>
        </TableCell>

        {/* Suggested Action */}
        <TableCell align="center" sx={{ borderColor }}>
          {suggestedAction ? (
            <Chip
              label={suggestedAction}
              size="small"
              sx={{
                bgcolor: actionStyle.bg,
                color: actionStyle.color,
                fontWeight: 700,
                fontSize: '0.7rem',
                minWidth: 60,
              }}
            />
          ) : (
            <Chip label="—" size="small" sx={{ bgcolor: isDark ? '#334155' : '#e2e8f0', color: dimText }} />
          )}
        </TableCell>

        {/* Composite Score */}
        <TableCell align="center" sx={{ borderColor }}>
          <ScoreBadge score={score} />
        </TableCell>

        {/* Sub Scores */}
        <TableCell sx={{ borderColor, display: { xs: 'none', lg: 'table-cell' } }}>
          <Stack direction="row" spacing={0.5}>
            <ScoreBadge score={signal.truthScore} size="small" />
            <ScoreBadge score={signal.relevanceScore} size="small" />
          </Stack>
        </TableCell>

        {/* Actions */}
        <TableCell align="right" sx={{ borderColor }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(signal.id);
            }}
          >
            <OpenInNewIcon sx={{ color: dimText, fontSize: 18 }} />
          </IconButton>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon sx={{ color: dimText }} /> : <ExpandMoreIcon sx={{ color: dimText }} />}
          </IconButton>
        </TableCell>
      </TableRow>

      {/* Expanded Detail */}
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} sx={{ bgcolor: expandedBg, borderBottom: 1, borderColor }}>
            <Collapse in={expanded}>
              <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                <Typography variant="body2" sx={{ color: primaryText, mb: 1.5, fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
                  {signal.content}
                </Typography>

                {affectedAssets.length > 0 && (
                  <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap">
                    {affectedAssets.map((asset) => (
                      <Chip key={asset} label={asset} size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: primaryText, fontWeight: 600 }} />
                    ))}
                  </Stack>
                )}

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${t('aiSignals.drawer.truth') || 'Truth'}: ${signal.truthScore ?? '?'}%`} size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText }} />
                  <Chip label={`${t('aiSignals.drawer.relevance') || 'Relevance'}: ${signal.relevanceScore ?? '?'}%`} size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText }} />
                </Stack>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
