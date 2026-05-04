// ── Settings Page (Clean — Profile + Notifications + Appearance) ──

import React, { useState, useCallback } from 'react';
import {
  Container, Typography, Box, Stack, Card, CardContent, Tabs, Tab,
  TextField, Button, Avatar, Switch, FormControlLabel, FormControl, InputLabel, Select, MenuItem,
  Slider, CircularProgress,
  Snackbar, Alert, useMediaQuery, useTheme, Skeleton,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import { usePermissions } from '@/shared/lib/usePermissions';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

function ProfileTab({
  primaryText, mutedText, borderColor, onToast,
}: {
  primaryText: string; mutedText: string; borderColor: string;
  onToast: (msg: string, sev: 'success' | 'error' | 'info') => void;
}) {
  const { t } = useTranslation();
  const { role } = usePermissions();
  const [name, setName] = useState('Ki');
  const [email, setEmail] = useState('ki@aqtms.io');
  const [timezone, setTimezone] = useState('Asia/Hong_Kong');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => { const tm = setTimeout(() => setLoading(false), 400); return () => clearTimeout(tm); }, []);

  const inputSx = {
    '& .MuiOutlinedInput-root': { color: primaryText, '& fieldset': { borderColor }, '&:hover fieldset': { borderColor: '#3b82f6' }, borderRadius: 3 },
    '& .MuiInputLabel-root': { color: mutedText },
  };

  if (loading) {
    return (
      <Stack spacing={3} alignItems="center">
        <Skeleton variant="circular" width={80} height={80} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3 }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3} alignItems="center">
      <Avatar sx={{ width: 80, height: 80, bgcolor: '#3b82f6', fontSize: '2rem', fontWeight: 700 }}>
        {name.charAt(0).toUpperCase()}
      </Avatar>
      <Typography variant="caption" sx={{ color: mutedText, mt: -1 }}>
        {t(`roles.${role}` as any, role)}
      </Typography>
      <Stack spacing={2.5} width="100%" maxWidth={480}>
        <TextField label={t('settings.profile.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth sx={inputSx} />
        <TextField label={t('settings.profile.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth sx={inputSx} />
        <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { color: primaryText, '& fieldset': { borderColor }, borderRadius: 3 } }}>
          <InputLabel sx={{ color: mutedText }}>{t('settings.profile.timezone')}</InputLabel>
          <Select value={timezone} onChange={(e) => setTimezone(e.target.value)} label={t('settings.profile.timezone')}>
            {['UTC', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Singapore', 'Europe/London', 'Europe/Vilnius', 'America/New_York'].map(tz => (
              <MenuItem key={tz} value={tz}>{tz}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={async () => { setSaving(true); await new Promise(r => setTimeout(r, 600)); setSaving(false); onToast(t('settings.profile.saved'), 'success'); }} disabled={saving}
          sx={{ borderRadius: 3, bgcolor: '#3b82f6', textTransform: 'none', py: 1.2 }}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}>
          {saving ? t('settings.profile.saving') : t('settings.profile.saveChanges')}
        </Button>
      </Stack>
    </Stack>
  );
}

function NotificationsTab({
  mutedText, cardBg, borderColor, onToast,
}: {
  mutedText: string; cardBg: string; borderColor: string;
  onToast: (msg: string, sev: 'success' | 'error' | 'info') => void;
}) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    emailNotifications: true, telegramAlerts: false, inAppNotifications: true,
  });
  const [riskThreshold, setRiskThreshold] = useState(70);

  const toggleSetting = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    onToast(`${t(`settings.notifications.${key}`)} ${value ? t('common.enabled') : t('common.disabled')}`, 'success');
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3 }}>
        <CardContent>
          <FormControlLabel
            control={<Switch checked={!!settings.emailNotifications} onChange={(_, v) => toggleSetting('emailNotifications', v)} />}
            label={<Box><Typography variant="body2">{t('settings.notifications.emailNotifications')}</Typography><Typography variant="caption" sx={{ color: mutedText }}>{t('settings.notifications.emailDesc')}</Typography></Box>}
          />
        </CardContent>
      </Card>
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3 }}>
        <CardContent>
          <FormControlLabel
            control={<Switch checked={!!settings.telegramAlerts} onChange={(_, v) => toggleSetting('telegramAlerts', v)} />}
            label={<Box><Typography variant="body2">{t('settings.notifications.telegramAlerts')}</Typography><Typography variant="caption" sx={{ color: mutedText }}>{t('settings.notifications.telegramDesc')}</Typography></Box>}
          />
        </CardContent>
      </Card>
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3 }}>
        <CardContent>
          <FormControlLabel
            control={<Switch checked={!!settings.inAppNotifications} onChange={(_, v) => toggleSetting('inAppNotifications', v)} />}
            label={<Box><Typography variant="body2">{t('settings.notifications.inAppNotifications')}</Typography><Typography variant="caption" sx={{ color: mutedText }}>{t('settings.notifications.inAppDesc')}</Typography></Box>}
          />
        </CardContent>
      </Card>
      <Card sx={{ bgcolor: cardBg, border: '1px solid', borderColor, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="body2" sx={{ mb: 1 }}>{t('settings.notifications.riskThreshold')}</Typography>
          <Typography variant="caption" sx={{ color: mutedText }}>{t('settings.notifications.thresholdDesc')} {riskThreshold}</Typography>
          <Slider value={riskThreshold} onChange={(_, v) => setRiskThreshold(v as number)} min={0} max={100} sx={{ color: '#3b82f6', mt: 1 }} />
        </CardContent>
      </Card>
    </Stack>
  );
}

export function SettingsPage() {
  const { mode } = useThemeMode();
  const theme = useTheme();
  const { t } = useTranslation();
  const { isAuthenticated } = usePermissions();
  const isDark = mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  const [tabValue, setTabValue] = useState(0);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });
  const showToast = useCallback((message: string, severity: 'success' | 'error' | 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  if (!isAuthenticated) return null;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          {t('settings.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: mutedText, mb: 1 }}>
          {t('settings.subtitle')}
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant={isMobile ? 'fullWidth' : 'standard'}
        sx={{ '& .MuiTab-root': { color: mutedText, textTransform: 'none', fontWeight: 600, minHeight: 48, '&.Mui-selected': { color: '#3b82f6' } }, '& .MuiTabs-indicator': { bgcolor: '#3b82f6' }, mb: 1 }}>
        <Tab icon={<PersonIcon />} iconPosition="start" label={t('settings.tabs.profile')} />
        <Tab icon={<NotificationsIcon />} iconPosition="start" label={t('settings.tabs.notifications')} />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <ProfileTab primaryText={primaryText} mutedText={mutedText} borderColor={borderColor} onToast={showToast} />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <NotificationsTab mutedText={mutedText} cardBg={cardBg} borderColor={borderColor} onToast={showToast} />
      </TabPanel>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} variant="filled" sx={{ borderRadius: 3, fontWeight: 600 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
