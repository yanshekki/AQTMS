// ── Settings Page (Phase A – Full Spec) ──
// 4 tabs: Profile, API Keys, Notifications, Security.
// Theme-aware, responsive, with loading / error / empty states + toast feedback for all actions.

import React, { useState, useCallback } from 'react';
import {
  Container, Typography, Box, Stack, Card, CardContent, Tabs, Tab,
  TextField, Button, Switch, FormControlLabel, Select, MenuItem,
  FormControl, InputLabel, Avatar, Divider, Chip, Slider, IconButton,
  CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, useMediaQuery, useTheme,
  Skeleton, Tooltip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useThemeMode } from '@/app/Providers';

// ── Types ──

interface ExchangeConnection {
  id: string;
  exchange: string;
  status: 'connected' | 'error' | 'disconnected';
  lastUsed: string;
}

interface ExchangeFormData {
  exchange: string;
  apiKey: string;
  secret: string;
  description: string;
}

// ── Mock exchange data ──

const EXCHANGE_OPTIONS = ['Binance', 'Bybit', 'OKX', 'KuCoin', 'Coinbase'];
const TIMEZONE_OPTIONS = [
  'UTC', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Singapore',
  'Europe/London', 'Europe/Vilnius', 'America/New_York', 'America/Chicago',
];

function generateMockExchanges(): ExchangeConnection[] {
  return [
    { id: 'ex-1', exchange: 'Binance', status: 'connected', lastUsed: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 'ex-2', exchange: 'Bybit', status: 'connected', lastUsed: new Date(Date.now() - 12 * 3600000).toISOString() },
    { id: 'ex-3', exchange: 'OKX', status: 'error', lastUsed: new Date(Date.now() - 24 * 3600000).toISOString() },
  ];
}

// ── Tab panel wrapper ──

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

// ── Sub-components ──

/** Profile tab content */
function ProfileTab({
  isDark, primaryText, mutedText, borderColor, onToast,
}: {
  isDark: boolean;
  primaryText: string;
  mutedText: string;
  borderColor: string;
  onToast: (msg: string, sev: 'success' | 'error' | 'info') => void;
}) {
  const [name, setName] = useState('Ki');
  const [email, setEmail] = useState('ki@aqtms.io');
  const [timezone, setTimezone] = useState('Asia/Hong_Kong');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simulate loading
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      color: primaryText,
      '& fieldset': { borderColor },
      '&:hover fieldset': { borderColor: '#3b82f6' },
      borderRadius: 3,
    },
    '& .MuiInputLabel-root': { color: mutedText },
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    onToast('Profile saved successfully', 'success');
  };

  if (loading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="circular" width={80} height={80} sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3} alignItems="center">
      {/* Avatar */}
      <Avatar sx={{ width: 80, height: 80, bgcolor: '#3b82f6', fontSize: '2rem', fontWeight: 700 }}>
        {name.charAt(0).toUpperCase()}
      </Avatar>

      <Stack spacing={2.5} width="100%" maxWidth={480}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={inputSx}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          sx={inputSx}
        />
        <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { color: primaryText, '& fieldset': { borderColor }, borderRadius: 3 } }}>
          <InputLabel sx={{ color: mutedText }}>Timezone</InputLabel>
          <Select value={timezone} onChange={(e) => setTimezone(e.target.value)} label="Timezone">
            {TIMEZONE_OPTIONS.map((tz) => (
              <MenuItem key={tz} value={tz}>{tz}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: 3, bgcolor: '#3b82f6', textTransform: 'none', py: 1.2 }}
          startIcon={saving ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : null}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </Stack>
    </Stack>
  );
}

/** API Keys tab content */
function ApiKeysTab({
  isDark, primaryText, mutedText, cardBg, borderColor, onToast,
}: {
  isDark: boolean;
  primaryText: string;
  mutedText: string;
  cardBg: string;
  borderColor: string;
  onToast: (msg: string, sev: 'success' | 'error' | 'info') => void;
}) {
  const [exchanges, setExchanges] = useState<ExchangeConnection[]>(generateMockExchanges);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExchangeConnection | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState<ExchangeFormData>({ exchange: '', apiKey: '', secret: '', description: '' });
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor },
      '&:hover fieldset': { borderColor: '#3b82f6' },
      borderRadius: 3,
      color: primaryText,
    },
    '& .MuiInputLabel-root': { color: mutedText },
  };

  const handleAdd = async () => {
    if (!form.exchange || !form.apiKey || !form.secret) {
      onToast('Please fill all required fields', 'error');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    const newEx: ExchangeConnection = {
      id: `ex-${Date.now()}`,
      exchange: form.exchange,
      status: 'connected',
      lastUsed: new Date().toISOString(),
    };
    setExchanges((prev) => [...prev, newEx]);
    setForm({ exchange: '', apiKey: '', secret: '', description: '' });
    setShowAddModal(false);
    setSubmitting(false);
    onToast(`${form.exchange} API key added`, 'success');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setExchanges((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    onToast(`${deleteTarget.exchange} connection removed`, 'info');
    setDeleteTarget(null);
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    await new Promise((r) => setTimeout(r, 1200));
    setTesting(null);
    // Simulate 90% success
    const success = Math.random() > 0.1;
    if (success) {
      setExchanges((prev) => prev.map((e) => e.id === id ? { ...e, status: 'connected' as const, lastUsed: new Date().toISOString() } : e));
      onToast('Connection test successful', 'success');
    } else {
      setExchanges((prev) => prev.map((e) => e.id === id ? { ...e, status: 'error' as const } : e));
      onToast('Connection test failed — check API key permissions', 'error');
    }
  };

  const statusChip = (status: ExchangeConnection['status']) => {
    const config = {
      connected: { bg: '#22c55e20', color: '#22c55e', label: 'Connected' },
      error: { bg: '#ef444420', color: '#ef4444', label: 'Error' },
      disconnected: { bg: '#f59e0b20', color: '#f59e0b', label: 'Disconnected' },
    };
    const c = config[status];
    return (
      <Chip
        icon={status === 'connected' ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <ErrorOutlineIcon sx={{ fontSize: 14 }} />}
        label={c.label}
        size="small"
        sx={{ bgcolor: c.bg, color: c.color, fontWeight: 600, fontSize: '0.65rem', height: 22 }}
      />
    );
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
        <Typography variant="body2" sx={{ color: mutedText }}>
          {exchanges.length} exchange{exchanges.length !== 1 ? 's' : ''} connected
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowAddModal(true)}
          sx={{ borderRadius: 3, bgcolor: '#3b82f6', textTransform: 'none' }}
        >
          Add API Key
        </Button>
      </Stack>

      {/* Exchange List */}
      {exchanges.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, bgcolor: cardBg, borderRadius: 3, border: '1px solid', borderColor }}>
          <VpnKeyIcon sx={{ fontSize: 48, color: mutedText, mb: 2 }} />
          <Typography variant="body1" sx={{ color: mutedText, mb: 2 }}>No exchange connections yet</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowAddModal(true)} sx={{ borderRadius: 3, borderColor: '#3b82f6', color: '#3b82f6' }}>
            Connect Your First Exchange
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: 'transparent', border: '1px solid', borderColor, borderRadius: 3, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? '#0f172a' : '#f1f5f9' }}>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>Exchange</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>Status</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }}>Last Used</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', fontWeight: 700, borderColor }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exchanges.map((ex) => (
                <TableRow key={ex.id} hover>
                  <TableCell sx={{ color: primaryText, fontSize: '0.75rem', borderColor, fontWeight: 600 }}>{ex.exchange}</TableCell>
                  <TableCell sx={{ borderColor }}>{statusChip(ex.status)}</TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>
                    {new Date(ex.lastUsed).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ borderColor }} align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Test Connection">
                        <IconButton
                          size="small"
                          onClick={() => handleTest(ex.id)}
                          disabled={testing === ex.id}
                          sx={{ color: mutedText }}
                        >
                          {testing === ex.id ? <CircularProgress size={16} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleteTarget(ex)} sx={{ color: '#ef4444' }}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add API Key Modal */}
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: isDark ? '#0f172a' : '#f8fafc', borderRadius: 4, border: '1px solid', borderColor } }}
      >
        <DialogTitle sx={{ color: primaryText, fontWeight: 700 }}>Add API Key</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: mutedText }}>Exchange</InputLabel>
              <Select
                value={form.exchange}
                onChange={(e) => setForm((f) => ({ ...f, exchange: e.target.value }))}
                label="Exchange"
                sx={{ color: primaryText, '& fieldset': { borderColor }, '&:hover fieldset': { borderColor: '#3b82f6' }, borderRadius: 3 }}
              >
                {EXCHANGE_OPTIONS.map((ex) => (
                  <MenuItem key={ex} value={ex}>{ex}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="API Key" value={form.apiKey} onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))} fullWidth sx={inputSx} />
            <TextField
              label="API Secret"
              type={showSecret ? 'text' : 'password'}
              value={form.secret}
              onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
              fullWidth
              sx={inputSx}
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={() => setShowSecret(!showSecret)} sx={{ color: mutedText }}>
                    {showSecret ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                ),
              }}
            />
            <TextField label="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} fullWidth sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowAddModal(false)} sx={{ color: mutedText, borderRadius: 3, textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : null}
            sx={{ borderRadius: 3, bgcolor: '#3b82f6', textTransform: 'none' }}
          >
            {submitting ? 'Adding…' : 'Add Key'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { bgcolor: isDark ? '#0f172a' : '#f8fafc', borderRadius: 4, border: '1px solid', borderColor } }}
      >
        <DialogTitle sx={{ color: primaryText, fontWeight: 700 }}>Remove API Key?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: mutedText }}>
            This will disconnect <strong style={{ color: primaryText }}>{deleteTarget?.exchange}</strong> and delete its API key.
            This action cannot be undone. Active trades will not be affected.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: mutedText, borderRadius: 3, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ borderRadius: 3, textTransform: 'none' }}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

/** Notifications tab content */
function NotificationsTab({
  primaryText, mutedText, cardBg, borderColor, onToast,
}: {
  isDark?: boolean;
  primaryText: string;
  mutedText: string;
  cardBg: string;
  borderColor: string;
  onToast: (msg: string, sev: 'success' | 'error' | 'info') => void;
}) {
  const [settings, setSettings] = useState({
    emailEnabled: true,
    telegramEnabled: true,
    inAppEnabled: true,
    riskThreshold: 60,
  });
  const [saving, setSaving] = useState(false);

  const handleToggle = (key: 'emailEnabled' | 'telegramEnabled' | 'inAppEnabled') => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
    onToast(`${key.replace('Enabled', '')} notifications ${settings[key] ? 'disabled' : 'enabled'}`, 'success');
  };

  const handleSaveThreshold = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    onToast(`Risk alert threshold set to ${settings.riskThreshold}`, 'success');
  };

  const switchSx = {
    '& .MuiSwitch-switchBase.Mui-checked': { color: '#3b82f6' },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#3b82f6' },
  };

  return (
    <Stack spacing={3}>
      {/* Notification channels */}
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 2 }}>Notification Channels</Typography>
          <Stack spacing={1.5}>
            <FormControlLabel
              control={<Switch checked={settings.emailEnabled} onChange={() => handleToggle('emailEnabled')} sx={switchSx} />}
              label={<Box><Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>Email Notifications</Typography><Typography variant="caption" sx={{ color: mutedText }}>Trade confirmations, risk alerts, weekly reports</Typography></Box>}
            />
            <FormControlLabel
              control={<Switch checked={settings.telegramEnabled} onChange={() => handleToggle('telegramEnabled')} sx={switchSx} />}
              label={<Box><Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>Telegram Alerts</Typography><Typography variant="caption" sx={{ color: mutedText }}>Real-time signals, urgent risk breaches</Typography></Box>}
            />
            <FormControlLabel
              control={<Switch checked={settings.inAppEnabled} onChange={() => handleToggle('inAppEnabled')} sx={switchSx} />}
              label={<Box><Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>In-App Notifications</Typography><Typography variant="caption" sx={{ color: mutedText }}>Dashboard alerts, system health updates</Typography></Box>}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Risk threshold */}
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 3 }}>Risk Alert Threshold</Typography>
          <Typography variant="body2" sx={{ color: mutedText, mb: 0.5 }}>
            Trigger alerts when risk score exceeds:
          </Typography>
          <Box sx={{ px: 1 }}>
            <Slider
              value={settings.riskThreshold}
              onChange={(_, val) => setSettings((s) => ({ ...s, riskThreshold: val as number }))}
              min={0}
              max={100}
              step={5}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}`}
              marks={[
                { value: 0, label: '0' },
                { value: 30, label: '30' },
                { value: 60, label: '60' },
                { value: 100, label: '100' },
              ]}
              sx={{
                color: settings.riskThreshold <= 30 ? '#22c55e' : settings.riskThreshold <= 60 ? '#f59e0b' : '#ef4444',
                '& .MuiSlider-thumb': { boxShadow: 'none' },
                '& .MuiSlider-markLabel': { color: mutedText, fontSize: '0.7rem' },
              }}
            />
            <Stack direction="row" justifyContent="center" mt={2}>
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveThreshold}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : null}
                sx={{ borderRadius: 3, bgcolor: '#3b82f6', textTransform: 'none' }}
              >
                {saving ? 'Saving…' : 'Save Threshold'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

/** Security tab content */
function SecurityTab({
  isDark, primaryText, mutedText, cardBg, borderColor, onToast,
}: {
  isDark: boolean;
  primaryText: string;
  mutedText: string;
  cardBg: string;
  borderColor: string;
  onToast: (msg: string, sev: 'success' | 'error' | 'info') => void;
}) {
  const handleCopyWallet = async () => {
    try {
      await navigator.clipboard.writeText('0xB8c77482e45F1F44dE1745F52C74426C631bDD52');
      onToast('Wallet address copied', 'success');
    } catch {
      onToast('Failed to copy', 'error');
    }
  };

  return (
    <Stack spacing={3}>
      {/* Change Password */}
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 2 }}>Change Password</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" sx={{ color: mutedText }}>Password management is coming soon.</Typography>
            <Chip label="Coming Soon" size="small" sx={{ bgcolor: '#f59e0b20', color: '#f59e0b', fontWeight: 600 }} />
          </Box>
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 2 }}>Two-Factor Authentication</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" sx={{ color: mutedText }}>Google Authenticator / TOTP support is coming soon.</Typography>
            <Chip label="Coming Soon" size="small" sx={{ bgcolor: '#f59e0b20', color: '#f59e0b', fontWeight: 600 }} />
          </Box>
        </CardContent>
      </Card>

      {/* Wallet */}
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 2 }}>Connected Wallet</Typography>
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Chip
              label="0xB8c7...bDD52"
              size="small"
              sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText, fontFamily: 'monospace', fontWeight: 600 }}
            />
            <Tooltip title="Copy address">
              <IconButton size="small" onClick={handleCopyWallet} sx={{ color: mutedText }}>
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Typography variant="caption" sx={{ color: mutedText, display: 'block', mt: 1 }}>
            Ethereum Mainnet · Connected via MetaMask
          </Typography>
        </CardContent>
      </Card>

      {/* Encryption info */}
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 2 }}>API Key Encryption</Typography>
          <Chip
            icon={<SecurityIcon sx={{ fontSize: 16 }} />}
            label="AES-256-GCM"
            size="small"
            sx={{ bgcolor: '#22c55e20', color: '#22c55e', fontWeight: 700 }}
          />
          <Typography variant="caption" sx={{ color: mutedText, display: 'block', mt: 1 }}>
            All API keys are encrypted at rest using AES-256-GCM. Keys are never logged or stored in plaintext.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

// ── Main Page ──

export function SettingsPage() {
  const { mode, toggle } = useThemeMode();
  const theme = useTheme();
  const isDark = mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  const [tabValue, setTabValue] = useState(0);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  const showToast = useCallback((message: string, severity: 'success' | 'error' | 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  const tabs = [
    { label: 'Profile', icon: <PersonIcon sx={{ fontSize: 20 }} />, component: ProfileTab },
    { label: 'API Keys', icon: <VpnKeyIcon sx={{ fontSize: 20 }} />, component: ApiKeysTab },
    { label: 'Notifications', icon: <NotificationsIcon sx={{ fontSize: 20 }} />, component: NotificationsTab },
    { label: 'Security', icon: <SecurityIcon sx={{ fontSize: 20 }} />, component: SecurityTab },
  ];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box className="fade-in-up">
        <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          Settings
        </Typography>
        <Typography variant="body2" sx={{ color: mutedText, mb: 1 }}>
          User preferences · Notification · API Key Management · Security
        </Typography>
      </Box>

      {/* Theme Toggle */}
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3, mb: 2, backdropFilter: 'blur(12px)' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>Appearance</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={isDark}
                onChange={toggle}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#3b82f6' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#3b82f6' } }}
              />
            }
            label={<Typography variant="body2" sx={{ color: primaryText }}>{isDark ? 'Dark Mode' : 'Light Mode'}</Typography>}
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        variant={isMobile ? 'scrollable' : 'fullWidth'}
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            color: mutedText,
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 48,
            '&.Mui-selected': { color: '#3b82f6' },
          },
          '& .MuiTabs-indicator': { bgcolor: '#3b82f6' },
        }}
      >
        {tabs.map((t) => (
          <Tab key={t.label} icon={t.icon} label={t.label} iconPosition="start" />
        ))}
      </Tabs>

      <Divider sx={{ borderColor, mt: '-1px' }} />

      {/* Tab Content */}
      <TabPanel value={tabValue} index={0}>
        <ProfileTab isDark={isDark} primaryText={primaryText} mutedText={mutedText} borderColor={borderColor} onToast={showToast} />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <ApiKeysTab isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} onToast={showToast} />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <NotificationsTab isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} onToast={showToast} />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <SecurityTab isDark={isDark} primaryText={primaryText} mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} onToast={showToast} />
      </TabPanel>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 3, fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
