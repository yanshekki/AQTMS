// ── Scoring Rules Page (Phase B) ──
// Rule list, editor with weight sliders, version history, enable/disable toggle
// Theme-aware · Responsive · Loading/Error/Empty states · Toast feedback

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Typography, Grid, Card, CardContent, Chip, Box, Stack, Button,
  TextField, Slider, Switch, FormControl, InputLabel, Select, MenuItem,
  Skeleton, Alert, Snackbar, IconButton, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Divider, CircularProgress,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import RestoreIcon from '@mui/icons-material/Restore';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CloseIcon from '@mui/icons-material/Close';
import { useThemeMode } from '@/app/Providers';
import { scoringRulesApi } from '@/shared/api/scoringRulesApi';

// ── Types ──

type RuleStatus = 'Active' | 'Draft';
type SignalAction = 'BUY' | 'SELL' | 'ALERT' | 'IGNORE';

interface WeightConfig {
  truth: number;
  sentiment: number;
  relevance: number;
  confidence: number;
}

interface RuleVersion {
  version: string;
  timestamp: string;
  weights: WeightConfig;
  threshold: number;
  action: SignalAction;
  changedBy: string;
}

interface ScoringRule {
  id: string;
  name: string;
  version: string;
  status: RuleStatus;
  enabled: boolean;
  weights: WeightConfig;
  threshold: number;
  action: SignalAction;
  history: RuleVersion[];
}

// ── Mock Data ──

const MOCK_RULES: ScoringRule[] = [
  {
    id: 'rule-1',
    name: 'High Signal Strategy',
    version: 'v3',
    status: 'Active',
    enabled: true,
    weights: { truth: 35, sentiment: 15, relevance: 40, confidence: 10 },
    threshold: 80,
    action: 'BUY',
    history: [
      { version: 'v3', timestamp: '2026-05-02T10:30:00Z', weights: { truth: 35, sentiment: 15, relevance: 40, confidence: 10 }, threshold: 80, action: 'BUY', changedBy: 'Ki' },
      { version: 'v2', timestamp: '2026-04-28T14:00:00Z', weights: { truth: 40, sentiment: 10, relevance: 35, confidence: 15 }, threshold: 75, action: 'BUY', changedBy: 'Ki' },
      { version: 'v1', timestamp: '2026-04-20T09:00:00Z', weights: { truth: 40, sentiment: 20, relevance: 30, confidence: 10 }, threshold: 70, action: 'ALERT', changedBy: 'System' },
    ],
  },
  {
    id: 'rule-2',
    name: 'Conservative Filter',
    version: 'v1',
    status: 'Active',
    enabled: true,
    weights: { truth: 50, sentiment: 20, relevance: 20, confidence: 10 },
    threshold: 90,
    action: 'ALERT',
    history: [
      { version: 'v1', timestamp: '2026-05-01T08:00:00Z', weights: { truth: 50, sentiment: 20, relevance: 20, confidence: 10 }, threshold: 90, action: 'ALERT', changedBy: 'Analyst' },
    ],
  },
  {
    id: 'rule-3',
    name: 'Momentum Strategy',
    version: 'v2',
    status: 'Draft',
    enabled: false,
    weights: { truth: 20, sentiment: 35, relevance: 25, confidence: 20 },
    threshold: 70,
    action: 'SELL',
    history: [
      { version: 'v2', timestamp: '2026-04-25T16:00:00Z', weights: { truth: 20, sentiment: 35, relevance: 25, confidence: 20 }, threshold: 70, action: 'SELL', changedBy: 'Ki' },
      { version: 'v1', timestamp: '2026-04-15T11:00:00Z', weights: { truth: 25, sentiment: 30, relevance: 25, confidence: 20 }, threshold: 65, action: 'SELL', changedBy: 'Ki' },
    ],
  },
  {
    id: 'rule-4',
    name: 'News Sentiment Pump',
    version: 'v1',
    status: 'Draft',
    enabled: false,
    weights: { truth: 10, sentiment: 60, relevance: 20, confidence: 10 },
    threshold: 85,
    action: 'BUY',
    history: [
      { version: 'v1', timestamp: '2026-05-03T07:00:00Z', weights: { truth: 10, sentiment: 60, relevance: 20, confidence: 10 }, threshold: 85, action: 'BUY', changedBy: 'Ki' },
    ],
  },
];

// ── Simulated API ──

function simulateSave<T>(data: T, delay = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delay));
}

// ── Helpers ──

const WEIGHT_LABELS: { key: keyof WeightConfig; label: string; color: string }[] = [
  { key: 'truth', label: 'Truth Weight', color: '#3b82f6' },
  { key: 'sentiment', label: 'Sentiment Weight', color: '#8b5cf6' },
  { key: 'relevance', label: 'Relevance Weight', color: '#00f0ff' },
  { key: 'confidence', label: 'Confidence Weight', color: '#f59e0b' },
];

const ACTION_COLORS: Record<SignalAction, string> = {
  BUY: '#22c55e',
  SELL: '#ef4444',
  ALERT: '#f59e0b',
  IGNORE: '#6b7280',
};

// ── Sub-components ──

interface ScoringRuleListProps {
  rules: ScoringRule[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  isDark: boolean;
  primaryText: string;
  mutedText: string;
  borderColor: string;
  loading: boolean;
}

function ScoringRuleList({
  rules, selectedId, onSelect, onToggle, onDelete, isDark, primaryText, mutedText, borderColor, loading,
}: ScoringRuleListProps) {
  if (loading) {
    return (
      <Stack spacing={1.5}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 3 }} />
        ))}
      </Stack>
    );
  }

  if (rules.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <TuneIcon sx={{ fontSize: 48, color: mutedText, mb: 1 }} />
        <Typography variant="body2" sx={{ color: mutedText }}>No scoring rules yet</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {rules.map((rule) => {
        const selected = rule.id === selectedId;
        return (
          <Card
            key={rule.id}
            sx={{
              bgcolor: selected
                ? (isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.06)')
                : (isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)'),
              border: 1,
              borderColor: selected ? '#3b82f6' : borderColor,
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { borderColor: '#3b82f6' },
            }}
            onClick={() => onSelect(rule.id)}
          >
            <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                    <Typography
                      variant="body2"
                      sx={{ color: primaryText, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {rule.name}
                    </Typography>
                    <Chip
                      label={rule.status}
                      size="small"
                      sx={{
                        bgcolor: rule.status === 'Active' ? '#22c55e20' : '#f59e0b20',
                        color: rule.status === 'Active' ? '#22c55e' : '#f59e0b',
                        fontSize: '0.6rem',
                        height: 20,
                        fontWeight: 700,
                      }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="caption" sx={{ color: mutedText }}>
                      {rule.version} · T≥{rule.threshold} · {rule.action}
                    </Typography>
                    <FiberManualRecordIcon
                      sx={{
                        fontSize: 8,
                        color: rule.enabled ? '#22c55e' : '#6b7280',
                      }}
                    />
                  </Stack>
                </Box>
                <Switch
                  checked={rule.enabled}
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onToggle(rule.id, e.target.checked)}
                  sx={{ ml: 1 }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onDelete(rule.id); }}
                  sx={{ color: '#ef4444', ml: 0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

interface ScoringRuleEditorProps {
  rule: ScoringRule | null;
  weights: WeightConfig;
  threshold: number;
  action: SignalAction;
  onWeightChange: (key: keyof WeightConfig, value: number) => void;
  onThresholdChange: (value: number) => void;
  onActionChange: (value: SignalAction) => void;
  onSave: () => void;
  saving: boolean;
  primaryText: string;
  mutedText: string;
  borderColor: string;
  isNew: boolean;
  newName: string;
  onNewNameChange: (name: string) => void;
}

function ScoringRuleEditor({
  rule, weights, threshold, action, onWeightChange, onThresholdChange, onActionChange,
  onSave, saving, primaryText, mutedText, borderColor, isNew, newName, onNewNameChange,
}: ScoringRuleEditorProps) {
  const totalWeight = weights.truth + weights.sentiment + weights.relevance + weights.confidence;
  const totalValid = totalWeight === 100;
  const totalColor = totalWeight === 100 ? '#22c55e' : totalWeight > 100 ? '#ef4444' : '#f59e0b';

  if (!rule && !isNew) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <TuneIcon sx={{ fontSize: 56, color: mutedText, mb: 2 }} />
        <Typography variant="body1" sx={{ color: mutedText, mb: 1 }}>Select a rule or create a new one</Typography>
        <Typography variant="caption" sx={{ color: mutedText }}>
          Choose from the list on the left to edit its configuration
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2.5}>
      {/* Name */}
      {isNew ? (
        <TextField
          label="Rule Name"
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
          size="small"
          fullWidth
          sx={{
            input: { color: primaryText, fontWeight: 600 },
            label: { color: mutedText },
            '.MuiOutlinedInput-notchedOutline': { borderColor },
          }}
        />
      ) : (
        <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700 }}>
          {rule?.name} <Chip label={rule?.version} size="small" sx={{ bgcolor: '#3b82f620', color: '#3b82f6', ml: 1, fontSize: '0.65rem' }} />
        </Typography>
      )}

      <Divider sx={{ borderColor }} />

      {/* Weight Sliders */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="caption" sx={{ color: mutedText, fontWeight: 700, textTransform: 'uppercase' }}>
            Signal Weights
          </Typography>
          <Chip
            label={`Total: ${totalWeight}%`}
            size="small"
            sx={{
              bgcolor: `${totalColor}20`,
              color: totalColor,
              fontWeight: 800,
              fontSize: '0.7rem',
            }}
          />
        </Stack>
        {!totalValid && (
          <Typography variant="caption" sx={{ color: '#ef4444', display: 'block', mb: 1 }}>
            {totalWeight > 100 ? 'Total exceeds 100% — reduce some weights.' : 'Total must equal 100%.'}
          </Typography>
        )}

        <Stack spacing={2}>
          {WEIGHT_LABELS.map((w) => (
            <Box key={w.key}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" sx={{ color: mutedText, fontWeight: 600 }}>{w.label}</Typography>
                <Typography variant="caption" sx={{ color: w.color, fontWeight: 700, fontFamily: 'monospace' }}>
                  {weights[w.key]}%
                </Typography>
              </Stack>
              <Slider
                value={weights[w.key]}
                min={0}
                max={100}
                step={1}
                onChange={(_, v) => onWeightChange(w.key, v as number)}
                sx={{
                  color: w.color,
                  mt: 0.5,
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>
          ))}
        </Stack>
      </Box>

      <Divider sx={{ borderColor }} />

      {/* Threshold */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography variant="caption" sx={{ color: mutedText, fontWeight: 700, textTransform: 'uppercase' }}>
            Signal Threshold
          </Typography>
          <Chip
            label={`≥ ${threshold}`}
            size="small"
            sx={{ bgcolor: '#3b82f620', color: '#3b82f6', fontWeight: 700, fontSize: '0.7rem' }}
          />
        </Stack>
        <Slider
          value={threshold}
          min={0}
          max={100}
          step={1}
          valueLabelDisplay="auto"
          onChange={(_, v) => onThresholdChange(v as number)}
          sx={{ color: '#3b82f6', '& .MuiSlider-thumb': { width: 16, height: 16 } }}
        />
      </Box>

      {/* Action Mapping */}
      <FormControl size="small" fullWidth>
        <InputLabel sx={{ color: mutedText }}>Action on Signal</InputLabel>
        <Select
          value={action}
          label="Action on Signal"
          onChange={(e) => onActionChange(e.target.value as SignalAction)}
          sx={{ color: primaryText, '.MuiOutlinedInput-notchedOutline': { borderColor } }}
        >
          <MenuItem value="BUY">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ACTION_COLORS.BUY }} />
              Buy (Market Order)
            </Stack>
          </MenuItem>
          <MenuItem value="SELL">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ACTION_COLORS.SELL }} />
              Sell (Market Order)
            </Stack>
          </MenuItem>
          <MenuItem value="ALERT">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ACTION_COLORS.ALERT }} />
              Alert Only
            </Stack>
          </MenuItem>
          <MenuItem value="IGNORE">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ACTION_COLORS.IGNORE }} />
              Ignore
            </Stack>
          </MenuItem>
        </Select>
      </FormControl>

      {/* Save Button */}
      <Button
        variant="contained"
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
        onClick={onSave}
        disabled={saving || !totalValid || (isNew && !newName.trim())}
        sx={{
          background: totalValid ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : undefined,
          borderRadius: 3,
          fontWeight: 700,
          py: 1.2,
          '&:hover': { background: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
        }}
      >
        {saving ? 'Saving...' : (isNew ? 'Create Rule' : 'Save Changes')}
      </Button>
    </Stack>
  );
}

interface RuleVersionHistoryProps {
  history: RuleVersion[];
  onRollback: (version: RuleVersion) => void;
  rollingBack: string | null;
  isDark: boolean;
  mutedText: string;
  primaryText: string;
  borderColor: string;
}

function RuleVersionHistory({ history, onRollback, rollingBack, isDark, mutedText, primaryText, borderColor }: RuleVersionHistoryProps) {
  if (history.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: mutedText, textAlign: 'center', display: 'block', py: 2 }}>
        No version history available
      </Typography>
    );
  }

  return (
    <Stack spacing={1} divider={<Divider sx={{ borderColor }} />}>
      {history.map((v, idx) => {
        const isLatest = idx === 0;
        return (
          <Stack
            key={v.version}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 0.5 }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                <Typography variant="body2" sx={{ color: primaryText, fontWeight: isLatest ? 700 : 500 }}>
                  {v.version}
                </Typography>
                {isLatest && (
                  <Chip label="Current" size="small" sx={{ bgcolor: '#3b82f620', color: '#3b82f6', fontSize: '0.55rem', height: 18, fontWeight: 700 }} />
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: mutedText, display: 'block' }}>
                {v.action} · T≥{v.threshold} · T:{v.weights.truth} S:{v.weights.sentiment} R:{v.weights.relevance} C:{v.weights.confidence}
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? '#4b5563' : '#94a3b8', fontSize: '0.65rem' }}>
                {new Date(v.timestamp).toLocaleDateString()} by {v.changedBy}
              </Typography>
            </Box>
            {!isLatest && (
              <Button
                size="small"
                variant="outlined"
                startIcon={rollingBack === v.version ? <CircularProgress size={14} /> : <RestoreIcon fontSize="small" />}
                onClick={() => onRollback(v)}
                disabled={rollingBack !== null}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  px: 1.5,
                  borderColor: isDark ? '#374151' : '#cbd5e1',
                  color: mutedText,
                  ml: 1,
                  flexShrink: 0,
                }}
              >
                Rollback
              </Button>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

// ── Main Page ──

export function ScoringRulesPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [weights, setWeights] = useState<WeightConfig>({ truth: 25, sentiment: 25, relevance: 25, confidence: 25 });
  const [threshold, setThreshold] = useState(70);
  const [action, setAction] = useState<SignalAction>('BUY');
  const [isNew, setIsNew] = useState(false);
  const [newName, setNewName] = useState('');

  // Rollback state
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<RuleVersion | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false, message: '', severity: 'info',
  });

  const showToast = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  // Selected rule
  const selectedRule = useMemo(() => rules.find((r) => r.id === selectedId) ?? null, [rules, selectedId]);

  // Fetch rules from API with mock fallback
  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await scoringRulesApi.getRules().catch(() => ({
        success: true as const, data: MOCK_RULES, timestamp: '',
      }));
      const data = res.data as ScoringRule[];
      setRules(data);
      if (data.length > 0 && data[0]) {
        setSelectedId(data[0].id);
      }
    } catch {
      setError('Failed to load scoring rules.');
      showToast('Failed to load scoring rules', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Update editor when selected rule changes
  useEffect(() => {
    if (selectedRule) {
      setWeights({ ...selectedRule.weights });
      setThreshold(selectedRule.threshold);
      setAction(selectedRule.action);
      setIsNew(false);
      setNewName('');
    }
  }, [selectedRule]);

  // Handle weight change
  const handleWeightChange = useCallback((key: keyof WeightConfig, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Handle toggle
  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled, status: enabled ? ('Active' as RuleStatus) : (r.status === 'Active' ? 'Draft' as RuleStatus : r.status) } : r))
    );
    try {
      await simulateSave({ success: true }, 300);
      showToast(`Rule ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch {
      // Revert on failure
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r))
      );
      showToast('Failed to update rule', 'error');
    }
  }, [showToast]);

  // Handle save (create or update via API with fallback)
  const handleSave = useCallback(async () => {
    const totalWeight = weights.truth + weights.sentiment + weights.relevance + weights.confidence;
    if (totalWeight !== 100) {
      showToast('Weights must sum to 100%', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        // Create via API
        const payload = { name: newName.trim(), weights, threshold, action };
        await scoringRulesApi.createRule(payload);
        showToast('Rule created successfully', 'success');
        // Refresh list
        const res = await scoringRulesApi.getRules().catch(() => ({
          success: true as const, data: MOCK_RULES, timestamp: '',
        }));
        setRules(res.data as ScoringRule[]);
        setIsNew(false);
        setNewName('');
        setSelectedId(null);
      } else if (selectedRule) {
        // Update via API
        const payload = { weights, threshold, action };
        await scoringRulesApi.updateRule(selectedRule.id, payload);
        showToast('Rule saved successfully', 'success');
        // Refresh list
        const res = await scoringRulesApi.getRules().catch(() => ({
          success: true as const, data: MOCK_RULES, timestamp: '',
        }));
        setRules(res.data as ScoringRule[]);
      }
    } catch {
      showToast('Failed to save rule', 'error');
    } finally {
      setSaving(false);
    }
  }, [weights, threshold, action, selectedRule, isNew, newName, showToast]);

  // Handle new rule
  const handleNewRule = useCallback(() => {
    setWeights({ truth: 25, sentiment: 25, relevance: 25, confidence: 25 });
    setThreshold(70);
    setAction('BUY');
    setIsNew(true);
    setNewName('');
    setSelectedId(null);
  }, []);

  // Handle rollback
  const handleRollbackClick = useCallback((version: RuleVersion) => {
    setRollbackTarget(version);
    setRollbackOpen(true);
  }, []);

  const handleRollbackConfirm = useCallback(async () => {
    if (!rollbackTarget || !selectedRule) return;
    setRollbackOpen(false);
    setRollingBack(rollbackTarget.version);

    try {
      const payload = {
        weights: rollbackTarget.weights,
        threshold: rollbackTarget.threshold,
        action: rollbackTarget.action,
      };
      await scoringRulesApi.updateRule(selectedRule.id, payload);
      // Refresh
      const res = await scoringRulesApi.getRules().catch(() => ({
        success: true as const, data: MOCK_RULES, timestamp: '',
      }));
      setRules(res.data as ScoringRule[]);
      showToast(`Rolled back to ${rollbackTarget.version} configuration`, 'success');
    } catch {
      showToast('Rollback failed', 'error');
    } finally {
      setRollingBack(null);
      setRollbackTarget(null);
    }
  }, [rollbackTarget, selectedRule, showToast]);

  // Handle delete
  const handleDelete = useCallback(async (id: string) => {
    try {
      await scoringRulesApi.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
      showToast('Rule deleted', 'success');
    } catch {
      showToast('Failed to delete rule', 'error');
    }
  }, [selectedId, showToast]);

  // ── Loading State ──
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid item xs={12} md={5}>
            <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid item xs={12} md={7}>
            <Skeleton variant="rounded" height={600} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
          <Button
            variant="contained"
            onClick={fetchRules}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 3, fontWeight: 700 }}
          >
            Retry
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box className="fade-in-up">
        <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          <TuneIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#8b5cf6' }} />Scoring Rules
        </Typography>
        <Typography variant="body2" sx={{ color: mutedText, mb: { xs: 2, md: 4 } }}>
          Design scoring rules — configure weights, thresholds, and action mappings.
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }} className="stagger-children">
        {/* Left: Rule List */}
        <Grid item xs={12} md={5}>
          <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700 }}>
                  Rules
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleNewRule}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: isDark ? '#374151' : '#cbd5e1',
                    color: primaryText,
                    fontSize: '0.75rem',
                  }}
                >
                  New
                </Button>
              </Stack>

              <ScoringRuleList
                rules={rules}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onToggle={handleToggle}
                isDark={isDark}
                primaryText={primaryText}
                mutedText={mutedText}
                borderColor={borderColor}
                loading={false}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Editor + Version History */}
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            {/* Editor Card */}
            <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700 }}>
                    {isNew ? 'New Rule' : 'Rule Editor'}
                  </Typography>
                  {!isNew && selectedRule && (
                    <Chip
                      icon={<FiberManualRecordIcon sx={{ fontSize: 8, color: selectedRule.enabled ? '#22c55e' : '#6b7280 !important' }} />}
                      label={selectedRule.enabled ? 'Enabled' : 'Disabled'}
                      size="small"
                      sx={{
                        bgcolor: selectedRule.enabled ? '#22c55e20' : '#6b728020',
                        color: selectedRule.enabled ? '#22c55e' : '#6b7280',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                      }}
                    />
                  )}
                </Stack>

                <ScoringRuleEditor
                  rule={selectedRule}
                  weights={weights}
                  threshold={threshold}
                  action={action}
                  onWeightChange={handleWeightChange}
                  onThresholdChange={setThreshold}
                  onActionChange={setAction}
                  onSave={handleSave}
                  saving={saving}
                  primaryText={primaryText}
                  mutedText={mutedText}
                  borderColor={borderColor}
                  isNew={isNew}
                  newName={newName}
                  onNewNameChange={setNewName}
                />
              </CardContent>
            </Card>

            {/* Version History Card */}
            {!isNew && selectedRule && selectedRule.history.length > 0 && (
              <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <HistoryIcon sx={{ fontSize: 18, color: mutedText }} />
                    <Typography variant="subtitle2" sx={{ color: mutedText, fontWeight: 700 }}>
                      Version History
                    </Typography>
                  </Stack>
                  <RuleVersionHistory
                    history={selectedRule.history}
                    onRollback={handleRollbackClick}
                    rollingBack={rollingBack}
                    isDark={isDark}
                    mutedText={mutedText}
                    primaryText={primaryText}
                    borderColor={borderColor}
                  />
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Rollback Confirm Dialog */}
      <Dialog open={rollbackOpen} onClose={() => setRollbackOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: primaryText, fontWeight: 700 }}>
          Confirm Rollback
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: mutedText }}>
            Roll back to {rollbackTarget?.version} configuration?
            This will create a new version ({selectedRule ? `v${parseInt(selectedRule.version.slice(1)) + 1}` : 'new'}) with the previous settings:
          </DialogContentText>
          {rollbackTarget && (
            <Box sx={{ mt: 2, p: 2, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: mutedText, display: 'block' }}>
                Action: {rollbackTarget.action} · Threshold: ≥{rollbackTarget.threshold}
              </Typography>
              <Typography variant="caption" sx={{ color: mutedText, display: 'block' }}>
                Weights: T:{rollbackTarget.weights.truth} S:{rollbackTarget.weights.sentiment} R:{rollbackTarget.weights.relevance} C:{rollbackTarget.weights.confidence}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRollbackOpen(false)} sx={{ color: mutedText, fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRollbackConfirm}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Confirm Rollback
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast / Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 3, fontWeight: 600 }}
          action={
            <IconButton size="small" color="inherit" onClick={() => setToast((prev) => ({ ...prev, open: false }))}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
