// ── Admin Pages (User Management / Audit Log / System Settings) ──

import { Container, Typography, Box, Card, CardContent, Stack, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, FormControl, Select, MenuItem, Switch, FormControlLabel, TextField } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
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
        <Typography variant="body2" sx={{ color: isDark ? '#9ca3af' : '#64748b', mb: { xs: 2, md: 4 } }}>Admin panel — restricted access</Typography>
      </Box>
      {children}
    </Container>
  );
}

export function UserManagementPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';

  const users = [
    { id: '1', address: '0x1234...5678', role: 'ADMIN', status: 'Active', joined: '2026-05-01' },
    { id: '2', address: '0xabcd...ef01', role: 'TRADER', status: 'Active', joined: '2026-05-02' },
    { id: '3', address: '0x9876...5432', role: 'ANALYST', status: 'Active', joined: '2026-05-02' },
    { id: '4', address: '0xdead...beef', role: 'VIEWER', status: 'Inactive', joined: '2026-05-03' },
  ];

  return (
    <AdminLayout title="User Management">
      <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, backdropFilter: 'blur(12px)' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? '#0f172a' : '#f1f5f9' }}>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>Wallet</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>Role</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>Status</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>Joined</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ color: primaryText, fontSize: '0.75rem', borderColor, fontFamily: 'monospace' }}>{u.address}</TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select value={u.role} sx={{ color: primaryText, fontSize: '0.7rem', '.MuiOutlinedInput-notchedOutline': { borderColor } }}>
                        <MenuItem value="ADMIN">Admin</MenuItem>
                        <MenuItem value="TRADER">Trader</MenuItem>
                        <MenuItem value="ANALYST">Analyst</MenuItem>
                        <MenuItem value="VIEWER">Viewer</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell><Chip label={u.status} size="small" sx={{ bgcolor: u.status === 'Active' ? '#22c55e20' : '#6b728020', color: u.status === 'Active' ? '#22c55e' : '#6b7280', fontSize: '0.65rem' }} /></TableCell>
                  <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>{u.joined}</TableCell>
                  <TableCell align="right" sx={{ borderColor }}>
                    <Button size="small" sx={{ color: '#3b82f6', fontSize: '0.65rem' }}>Save</Button>
                    <Button size="small" sx={{ color: '#ef4444', fontSize: '0.65rem' }}>Disable</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </AdminLayout>
  );
}

export function AuditLogPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';

  return (
    <AdminLayout title="Audit Log">
      <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, backdropFilter: 'blur(12px)' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? '#0f172a' : '#f1f5f9' }}>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>Time</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>User</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>Action</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>Resource</TableCell>
                <TableCell sx={{ color: mutedText, fontSize: '0.7rem', borderColor }}>IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { time: '2026-05-03 12:00', user: '0x1234', action: 'trade:execute', resource: 'BTCUSDT', ip: '84.32.34.14' },
                { time: '2026-05-03 11:45', user: '0x1234', action: 'exchange:connect', resource: 'Binance', ip: '84.32.34.14' },
                { time: '2026-05-03 11:30', user: '0x1234', action: 'user:login', resource: 'user', ip: '84.32.34.14' },
                { time: '2026-05-03 11:00', user: '0xabcd', action: 'news:processed', resource: 'news', ip: '10.0.0.1' },
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
        <Button variant="outlined" size="small" onClick={() => {
          window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/audit/export`, '_blank');
        }} sx={{ borderColor, color: mutedText, borderRadius: 3 }}>Export CSV</Button>
      </Stack>
    </AdminLayout>
  );
}

export function SystemSettingsPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  return (
    <AdminLayout title="System Settings">
      <Stack spacing={3}>
        <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, backdropFilter: 'blur(12px)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 2 }}>AI Model Management</Typography>
            <Stack spacing={2}>
              {[
                { name: 'GPT-4o', type: 'OPENAI', status: 'Ready', model: 'gpt-4o' },
                { name: 'DeepSeek Chat', type: 'DEEPSEEK', status: 'Ready', model: 'deepseek-chat' },
                { name: 'Grok-2', type: 'GROK', status: 'Ready', model: 'grok-2' },
              ].map((m) => (
                <Stack key={m.name} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1, borderBottom: 1, borderColor }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: primaryText, fontWeight: 600 }}>{m.name}</Typography>
                    <Typography variant="caption" sx={{ color: mutedText }}>{m.type} · Model: {m.model}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip label={m.status} size="small" sx={{ bgcolor: '#22c55e20', color: '#22c55e' }} />
                    <Switch defaultChecked size="small" />
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, backdropFilter: 'blur(12px)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 2 }}>Rate Limiting</Typography>
            <TextField label="Max Requests / IP / min" defaultValue="100" size="small" type="number" sx={{ input: { color: primaryText }, label: { color: mutedText }, '.MuiOutlinedInput-notchedOutline': { borderColor }, mb: 2 }} />
            <FormControlLabel control={<Switch defaultChecked />} label={<Typography variant="body2" sx={{ color: primaryText }}>Enable Rate Limiting</Typography>} />
          </CardContent>
        </Card>
      </Stack>
    </AdminLayout>
  );
}
