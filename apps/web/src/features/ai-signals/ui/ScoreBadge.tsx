// ── Score Badge Component ──

import { Chip } from '@mui/material';

interface ScoreBadgeProps {
  score: number | null;
  label?: string;
}

export function ScoreBadge({ score, label }: ScoreBadgeProps) {
  if (score === null || score === undefined) {
    return <Chip label="N/A" size="small" sx={{ bgcolor: '#1f2937', color: '#6b7280' }} />;
  }

  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const bg = `${color}20`;

  return (
    <Chip
      label={label ?? `${Math.round(score)}%`}
      size="small"
      sx={{
        bgcolor: bg,
        color,
        fontWeight: 600,
        minWidth: 48,
      }}
    />
  );
}
