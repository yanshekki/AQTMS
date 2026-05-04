// ── Admin Pages (User Management / Audit Log / System Settings) ──

import { useState } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Stack, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Button, FormControl, Select,
  MenuItem, Switch, FormControlLabel, TextField, InputAdornment, IconButton, 
  Snackbar, Alert,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';

function AdminLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Typography variant="h5" sx={{ color: isDark ? '#f3f4f6' : '#0f172a', fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          <AdminPanelSettingsIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#ef4444' }} />{title}
        </Typography>
      </Box>
      {children}
    </Container>
  );
}

export function UserManagementPage() {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';

  const [users, setUsers] = useState([
    { id: '1', address: '0x1234...5678', role: 'ADMIN', status: 'Active', joined: '2026-05-01' },
    { id: '2', address: '0xabcd...ef01', role: 'TRADER', status: 'Active', joined: '2026-05-02' },
    { id: '3', address: '0x9876...5432', role: 'ANALYST', status: 'Active', joined: '2026-05-02' },
    { id: '4', address: '0xdead...beef', role: 'VIEWER', status: 'Inactive', joined: '2026-05-03' },
  ]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const filtered = users.filter(u => u.address.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()));

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: t('roles.SUPER_ADMIN'), ADMIN: t('roles.ADMIN'), TRADER: t('roles.TRADER'),
    ANALYST: t('roles.ANALYST'), VIEWER: t('roles.VIEWER'),
  };

  const updateRole = (id: string, role: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    setToast({ open: true, message: t('admin.users.saved') || 'Role updated', severity: 'success' });
  };

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    setToast({ open: true, message: t('admin.users.deleted') || 'User removed', severity: 'success' });
  };

  return (
    <AdminLayout title={t('admin.userManagement')}>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <TextField
          size="small" placeholder={t('common.search') + '...'} value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: mutedText, fontSize: 18 }} /></InputAdornment> }}
          sx={{ input: { color: primaryText, fontSize: '0.8rem' }, '.MuiOutlinedInput-notchedOutline': { borderColor }, flex: 1, maxWidth: 400 }}
        />
        <Button variant="contained" startIcon={<AddIcon />}
          sx={{ borderRadius: 2, bgcolor: '#3b82f6', textTransform: 'none', fontSize: '0.8rem' }}>
          {t('admin.users.add') || 'Add User'}
        </Button>
      </Stack>

      <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? '#0f172a' : '#f1f5f9' }}>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{t('admin.users.tableHeaders.wallet')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{t('admin.users.tableHeaders.role')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{t('admin.users.tableHeaders.status')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{t('admin.users.tableHeaders.joined')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor, textAlign: 'right' }}>{t('admin.users.tableHeaders.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(u => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ color: primaryText, fontSize: '0.75rem', borderColor, fontFamily: 'monospace' }}>{u.address}</TableCell>
                  <TableCell sx={{ borderColor }}>
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <Select value={u.role} onChange={e => updateRole(u.id, e.target.value)} sx={{ color: primaryText, fontSize: '0.7rem', '.MuiOutlinedInput-notchedOutline': { borderColor } }}>
                        {Object.entries(roleLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ borderColor }}>
                    <Chip label={u.status === 'Active' ? t('admin.users.status.active') : t('admin.users.status.inactive')}
                      size="small" onClick={() => toggleStatus(u.id)}
                      sx={{ bgcolor: u.status === 'Active' ? '#22c55e20' : '#6b728020', color: u.status === 'Active' ? '#22c55e' : '#6b7280', fontSize: '0.65rem', cursor: 'pointer' }} />
                  </TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{u.joined}</TableCell>
                  <TableCell align="right" sx={{ borderColor }}>
                    <IconButton size="small" onClick={() => deleteUser(u.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(p => ({ ...p, open: false }))}>
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 3 }}>{toast.message}</Alert>
      </Snackbar>
    </AdminLayout>
  );
}

export function AuditLogPage() {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';

  return (
    <AdminLayout title={t('admin.auditLog')}>
      <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? '#0f172a' : '#f1f5f9' }}>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{t('admin.audit.tableHeaders.time')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{t('admin.audit.tableHeaders.user')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{t('admin.audit.tableHeaders.action')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{t('admin.audit.tableHeaders.resource')}</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{t('admin.audit.tableHeaders.ip')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { time: '2026-05-04 12:00', user: '0x1234', action: 'trade:execute', resource: 'BTCUSDT', ip: '84.32.34.14' },
                { time: '2026-05-04 11:45', user: '0x1234', action: 'exchange:connect', resource: 'Binance', ip: '84.32.34.14' },
                { time: '2026-05-04 11:30', user: '0x1234', action: 'user:login', resource: 'user', ip: '84.32.34.14' },
                { time: '2026-05-04 11:00', user: '0xabcd', action: 'news:processed', resource: 'news', ip: '10.0.0.1' },
              ].map((log, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{log.time}</TableCell>
                  <TableCell sx={{ color: primaryText, fontSize: '0.7rem', borderColor, fontFamily: 'monospace' }}>{log.user}</TableCell>
                  <TableCell><Chip label={log.action} size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText, fontSize: '0.6rem' }} /></TableCell>
                  <TableCell sx={{ color: primaryText, fontSize: '0.7rem', borderColor }}>{log.resource}</TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor, fontFamily: 'monospace' }}>{log.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Button variant="outlined" size="small" onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/audit/export`, '_blank')}
          sx={{ borderColor, color: mutedText, borderRadius: 3, textTransform: 'none' }}>
          {t('admin.audit.exportCsv')}
        </Button>
      </Stack>
    </AdminLayout>
  );
}

export function SystemSettingsPage() {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  const [apiKeys, setApiKeys] = useState<Record<string, { key: string; show: boolean }>>({
    openai: { key: '', show: false },
    deepseek: { key: '', show: false },
    grok: { key: '', show: false },
    gemini: { key: '', show: false },
    ollama: { key: '', show: false },
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const updateKey = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: { ...prev[provider]!, key: value } }));
  };

  const toggleShow = (provider: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: { ...prev[provider]!, show: !prev[provider]!.show } }));
  };

  const saveKey = (provider: string) => {
    setToast({ open: true, message: `${provider} API key saved`, severity: 'success' });
  };

  const inputSx = { input: { color: primaryText, fontSize: '0.8rem' }, '.MuiOutlinedInput-notchedOutline': { borderColor }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' }, borderRadius: 2 };

  return (
    <AdminLayout title={t('admin.systemSettings')}>
      <Stack spacing={3}>
        <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 2 }}>
              {t('admin.system.aiModelManagement')}
            </Typography>
            <Stack spacing={2}>
              {[
                { id: 'openai', name: 'GPT-4o (OpenAI)', link: 'https://platform.openai.com/api-keys' },
                { id: 'deepseek', name: 'DeepSeek Chat', link: 'https://platform.deepseek.com/api_keys' },
                { id: 'grok', name: 'Grok-2 (xAI)', link: 'https://console.x.ai/' },
                { id: 'gemini', name: 'Gemini (Google)', link: 'https://aistudio.google.com/apikey' },
                { id: 'ollama', name: 'Ollama (Local)', link: 'https://ollama.com/' },
              ].map(m => (
                <Stack key={m.id} direction="row" spacing={2} alignItems="center" sx={{ py: 1, borderBottom: '1px solid', borderColor }}>
                  <Box sx={{ minWidth: 160 }}>
                    <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>{m.name}</Typography>
                    <Typography variant="caption" component="a" href={m.link} target="_blank" sx={{ color: '#3b82f6', textDecoration: 'none' }}>
                      Get API Key ↗
                    </Typography>
                  </Box>
                  <TextField
                    size="small" fullWidth
                    type={apiKeys[m.id]?.show ? 'text' : 'password'}
                    value={apiKeys[m.id]?.key || ''}
                    onChange={e => updateKey(m.id, e.target.value)}
                    placeholder={`Enter ${m.name} API key...`}
                    sx={inputSx}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => toggleShow(m.id)}>
                            {apiKeys[m.id]?.show ? <VisibilityOffIcon sx={{ fontSize: 16, color: mutedText }} /> : <VisibilityIcon sx={{ fontSize: 16, color: mutedText }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button variant="outlined" size="small" onClick={() => saveKey(m.id)}
                    sx={{ borderColor, color: mutedText, borderRadius: 2, textTransform: 'none', fontSize: '0.75rem', whiteSpace: 'nowrap', '&:hover': { borderColor: '#3b82f6', color: '#3b82f6' } }}>
                    Save
                  </Button>
                  <Switch defaultChecked size="small" />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 2 }}>
              {t('admin.system.rateLimiting')}
            </Typography>
            <TextField label={t('admin.system.maxRequests')} defaultValue="100" size="small" type="number"
              sx={{ ...inputSx, mb: 2, maxWidth: 200, '& .MuiInputLabel-root': { color: mutedText } }} />
            <FormControlLabel control={<Switch defaultChecked />} label={<Typography variant="body2" sx={{ color: primaryText }}>{t('admin.system.enableRateLimiting')}</Typography>} />
          </CardContent>
        </Card>
      </Stack>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(p => ({ ...p, open: false }))}>
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 3 }}>{toast.message}</Alert>
      </Snackbar>
    </AdminLayout>
  );
}
