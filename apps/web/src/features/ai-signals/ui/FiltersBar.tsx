// ── Filters Bar (Theme-aware + Responsive) ──

import { Stack, TextField, FormControl, InputLabel, Select, MenuItem, Slider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import type { SignalFilters } from '../lib/types';

interface FiltersBarProps { filters: SignalFilters; onChange: (patch: Partial<SignalFilters>) => void; }

export function FiltersBar({ filters, onChange }: FiltersBarProps) {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const borderColor = isDark ? '#374151' : '#cbd5e1';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const bg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';

  const SOURCES = [
    { value: '', label: t('aiSignals.filters.all') },
    { value: 'TELEGRAM', label: t('aiSignals.filters.telegram') },
    { value: 'X', label: t('aiSignals.filters.xcom') },
    { value: 'ONCHAIN', label: t('aiSignals.filters.onchain') },
  ];

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, md: 2 }} sx={{ p: { xs: 1.5, md: 2 }, bgcolor: bg, borderRadius: 3, border: 1, borderColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)', mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
        <InputLabel sx={{ color: mutedText }}>{t('aiSignals.filters.source')}</InputLabel>
        <Select value={filters.source ?? ''} onChange={(e) => onChange({ source: e.target.value || undefined })} label={t('aiSignals.filters.source')} sx={{ color: primaryText, '.MuiOutlinedInput-notchedOutline': { borderColor } }}>
          {SOURCES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField size="small" label={t('aiSignals.filters.asset')} value={filters.asset ?? ''} onChange={(e) => onChange({ asset: e.target.value || undefined })} sx={{ minWidth: { xs: '100%', sm: 120 }, input: { color: primaryText }, label: { color: mutedText }, '.MuiOutlinedInput-notchedOutline': { borderColor } }} />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 200 }, maxWidth: 300 }}>
        <Typography variant="caption" sx={{ color: mutedText, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>{t('aiSignals.filters.minScore')}</Typography>
        <Slider size="small" value={filters.minScore ?? 0} onChange={(_, val) => onChange({ minScore: val as number })} min={0} max={100} valueLabelDisplay="auto" sx={{ color: '#3b82f6' }} />
        <Typography variant="caption" sx={{ color: primaryText, minWidth: 28, fontWeight: 600, fontSize: '0.75rem' }}>{filters.minScore ?? 0}</Typography>
      </Stack>
    </Stack>
  );
}
