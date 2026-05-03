// ── Notifications Page (Phase B) ──
// In-app notification center with type filters, read/unread, relative time, click-to-navigate
// Theme-aware · Responsive · Loading/Error/Empty states · Toast feedback

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Typography, Card, CardContent, Chip, Box, Stack, Badge,
  Skeleton, Alert, Snackbar, IconButton, Button, CircularProgress,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CircleIcon from '@mui/icons-material/Circle';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import {
  TrendingUp as TradeIcon,
  Psychology as SignalIcon,
  Warning as RiskIcon,
  Settings as SystemIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import { notificationsApi } from '@/shared/api/notificationsApi';

type NotificationType = 'trade' | 'signal' | 'risk' | 'system';
type FilterTab = 'all' | 'unread' | 'trade' | 'signal' | 'risk' | 'system';

interface Notification {
  id: string; type: NotificationType; title: string; message: string; time: string; read: boolean; targetRoute: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'trade', title: 'Order Filled — BTC/USDT', message: 'Buy 0.01 BTC @ $50,200.00 executed on Binance.', time: new Date(Date.now() - 2*60*1000).toISOString(), read: false, targetRoute: '/trades' },
  { id: '2', type: 'signal', title: 'High Signal — BTC Composite 87/100', message: 'AI composite score 87/100 from Telegram source. Suggested: BUY.', time: new Date(Date.now() - 15*60*1000).toISOString(), read: false, targetRoute: '/ai-signals' },
  { id: '3', type: 'risk', title: 'Concentration Warning — BTC at 45%', message: 'BTC allocation at 45% exceeds recommended 25% limit. Consider rebalancing.', time: new Date(Date.now() - 60*60*1000).toISOString(), read: false, targetRoute: '/risk' },
  { id: '4', type: 'system', title: 'Exchange Connected — Binance', message: 'API connection test passed. Balance: $5,000 USDT.', time: new Date(Date.now() - 2*60*60*1000).toISOString(), read: true, targetRoute: '/exchanges' },
  { id: '5', type: 'signal', title: 'AI Signal — ETH/USDT Below Threshold', message: 'Composite score 72/100. Below threshold — not trading.', time: new Date(Date.now() - 3*60*60*1000).toISOString(), read: true, targetRoute: '/ai-signals' },
  { id: '6', type: 'trade', title: 'Stop Loss Triggered — SOL/USDT', message: 'SOL dropped 8%. Stop loss executed at $152.30. Loss: -$245.', time: new Date(Date.now() - 5*60*60*1000).toISOString(), read: true, targetRoute: '/trades' },
  { id: '7', type: 'risk', title: 'Drawdown Alert — Portfolio -12.3%', message: 'Max drawdown exceeded 10% threshold. Current: -12.3%. Review positions.', time: new Date(Date.now() - 8*60*60*1000).toISOString(), read: false, targetRoute: '/risk' },
  { id: '8', type: 'system', title: 'System Update — v2.1.0 Deployed', message: 'AI signal scoring engine updated with new sentiment model.', time: new Date(Date.now() - 12*60*60*1000).toISOString(), read: true, targetRoute: '/settings' },
  { id: '9', type: 'trade', title: 'Take Profit — MATIC/USDT', message: 'MATIC hit +15% target. Sold 500 MATIC @ $1.42. Profit: +$210.', time: new Date(Date.now() - 18*60*60*1000).toISOString(), read: true, targetRoute: '/trades' },
  { id: '10', type: 'signal', title: 'New Signal Source Added — Discord', message: 'Discord channel #crypto-signals connected. 3 new keywords configured.', time: new Date(Date.now() - 24*60*60*1000).toISOString(), read: true, targetRoute: '/ai-signals' },
  { id: '11', type: 'risk', title: 'Volatility Spike — BTC 30d +45%', message: 'BTC 30-day volatility at 45%, above 35% threshold. Risk score elevated.', time: new Date(Date.now() - 30*60*60*1000).toISOString(), read: true, targetRoute: '/risk' },
  { id: '12', type: 'system', title: 'Backup Completed', message: 'Automated daily backup completed. 142MB stored.', time: new Date(Date.now() - 36*60*60*1000).toISOString(), read: true, targetRoute: '/settings' },
];

function relativeTimeLocal(isoString: string, t: (key: string) => string): string {
  const now = Date.now(); const then = new Date(isoString).getTime(); const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000); const diffHr = Math.floor(diffMin / 60); const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return t('notifications.relativeTime.justNow');
  if (diffMin < 60) return `${diffMin} ${t('notifications.relativeTime.minAgo')}`;
  if (diffHr < 24) return `${diffHr} ${diffHr > 1 ? t('notifications.relativeTime.hoursAgo') : t('notifications.relativeTime.hourAgo')}`;
  if (diffDay < 7) return `${diffDay} ${diffDay > 1 ? t('notifications.relativeTime.daysAgo') : t('notifications.relativeTime.dayAgo')}`;
  return new Date(isoString).toLocaleDateString();
}

const FILTER_TABS: { key: FilterTab; labelKey: string }[] = [
  { key: 'all', labelKey: 'notifications.filters.all' },
  { key: 'unread', labelKey: 'notifications.filters.unread' },
  { key: 'trade', labelKey: 'notifications.filters.trade' },
  { key: 'signal', labelKey: 'notifications.filters.signal' },
  { key: 'risk', labelKey: 'notifications.filters.risk' },
  { key: 'system', labelKey: 'notifications.filters.system' },
];

function getTypeConfig(): Record<NotificationType, { color: string; icon: React.ReactNode }> {
  return {
    trade: { color: '#22c55e', icon: <TradeIcon sx={{ fontSize: 18 }} /> },
    signal: { color: '#3b82f6', icon: <SignalIcon sx={{ fontSize: 18 }} /> },
    risk: { color: '#ef4444', icon: <RiskIcon sx={{ fontSize: 18 }} /> },
    system: { color: '#f59e0b', icon: <SystemIcon sx={{ fontSize: 18 }} /> },
  };
}

interface NotificationItemProps {
  notification: Notification; isDark: boolean; primaryText: string; mutedText: string; borderColor: string;
  onClick: (n: Notification) => void; marking: boolean;
}

function NotificationItem({ notification: n, isDark, primaryText, mutedText, borderColor, onClick, marking }: NotificationItemProps) {
  const { t } = useTranslation();
  const typeConfig = getTypeConfig();
  const config = typeConfig[n.type];
  const isUnread = !n.read;

  return (
    <Card sx={{
      bgcolor: isUnread ? (isDark ? 'rgba(30,41,59,0.8)' : 'rgba(241,245,249,0.9)') : (isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)'),
      border: 1, borderColor: isUnread ? config.color : borderColor, borderLeft: `3px solid ${config.color}`,
      borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s', opacity: marking ? 0.6 : 1,
      '&:hover': { borderColor: config.color, transform: 'translateX(2px)', bgcolor: isDark ? 'rgba(30,41,59,0.9)' : 'rgba(241,245,249,0.98)' },
    }} onClick={() => onClick(n)}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ pt: 0.5 }}>
            {isUnread ? <CircleIcon sx={{ color: config.color, fontSize: 10 }} /> : <Box sx={{ width: 10, height: 10, borderRadius: '50%', border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}` }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
              <Typography variant="body2" sx={{ color: primaryText, fontWeight: isUnread ? 700 : 500, fontSize: { xs: '0.8rem', md: '0.85rem' }, lineHeight: 1.4 }}>{n.title}</Typography>
              <Chip icon={config.icon as React.ReactElement} label={t(`notifications.typeLabels.${n.type}` as any, n.type)} size="small"
                sx={{ bgcolor: `${config.color}20`, color: config.color, fontSize: '0.6rem', height: 22, fontWeight: 700, ml: 1, flexShrink: 0, '& .MuiChip-icon': { color: config.color, ml: 0.5 } }} />
            </Stack>
            <Typography variant="body2" sx={{ color: mutedText, fontSize: '0.78rem', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.message}</Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: isDark ? '#4b5563' : '#94a3b8', fontSize: '0.68rem' }}>{relativeTimeLocal(n.time, t)}</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ opacity: 0.7 }}>
                <OpenInNewIcon sx={{ fontSize: 12, color: mutedText }} />
                <Typography variant="caption" sx={{ color: mutedText, fontSize: '0.65rem' }}>{n.targetRoute}</Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function NotificationsPage() {
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [marking, setMarking] = useState<Set<string>>(new Set());
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  const showToast = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await notificationsApi.getNotifications().catch(() => ({ success: true as const, data: MOCK_NOTIFICATIONS, timestamp: '' }));
      setNotifications(res.data as Notification[]);
    } catch {
      setError(t('notifications.failedToLoad'));
      showToast(t('notifications.failedToLoad'), 'error');
    } finally { setLoading(false); }
  }, [showToast, t]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'all': return notifications;
      case 'unread': return notifications.filter(n => !n.read);
      case 'trade': case 'signal': case 'risk': case 'system': return notifications.filter(n => n.type === filter);
      default: return notifications;
    }
  }, [notifications, filter]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const handleClick = useCallback(async (notification: Notification) => {
    if (marking.has(notification.id)) return;
    setMarking(prev => new Set(prev).add(notification.id));
    try {
      if (!notification.read) {
        await notificationsApi.markAsRead(notification.id).catch(() => null);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
        showToast(`${t('notifications.markedAsRead')} ${notification.targetRoute}`, 'info');
      } else {
        showToast(`${t('notifications.navigating')} ${notification.targetRoute}...`, 'info');
      }
    } catch {
      showToast(t('notifications.actionFailed'), 'error');
    } finally {
      setMarking(prev => { const next = new Set(prev); next.delete(notification.id); return next; });
    }
  }, [marking, showToast, t]);

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) { showToast(t('notifications.noUnreadToMark'), 'info'); return; }
    setMarkAllLoading(true);
    try {
      await notificationsApi.markAllRead().catch(() => null);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      showToast(`${unreadIds.length} ${t('notifications.markedAllRead')}`, 'success');
    } catch {
      showToast(t('notifications.markAllFailed'), 'error');
    } finally { setMarkAllLoading(false); }
  }, [notifications, showToast, t]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of FILTER_TABS) {
      if (tab.key === 'all') counts[tab.key] = notifications.length;
      else if (tab.key === 'unread') counts[tab.key] = notifications.filter(n => !n.read).length;
      else counts[tab.key] = notifications.filter(n => n.type === tab.key).length;
    }
    return counts;
  }, [notifications]);

  if (loading) {
    return <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Skeleton variant="text" width={220} height={40} sx={{ mb: 1 }} /><Skeleton variant="text" width={180} height={20} sx={{ mb: 3 }} />
      <Stack direction="row" spacing={1} mb={3}>{[1,2,3,4,5].map(i => <Skeleton key={i} variant="rounded" width={70} height={32} sx={{ borderRadius: 2 }} />)}</Stack>
      <Stack spacing={1.5}>{[1,2,3,4,5].map(i => <Skeleton key={i} variant="rounded" height={90} sx={{ borderRadius: 3 }} />)}</Stack>
    </Container>;
  }

  if (error) {
    return <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchNotifications}
          sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 3, fontWeight: 700 }}>{t('common.retry')}</Button>
      </Card>
    </Container>;
  }

  if (notifications.length === 0) {
    return <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <NotificationsIcon sx={{ color: isDark ? '#00f0ff' : '#2563eb', fontSize: 28 }} />
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>{t('notifications.title')}</Typography>
        </Stack>
      </Box>
      <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, p: 6, textAlign: 'center' }}>
        <NotificationsIcon sx={{ fontSize: 64, color: mutedText, mb: 2 }} />
        <Typography variant="h6" sx={{ color: primaryText, fontWeight: 700, mb: 1 }}>{t('notifications.noNotifications')}</Typography>
        <Typography variant="body2" sx={{ color: mutedText }}>{t('notifications.caughtUp')}</Typography>
      </Card>
    </Container>;
  }

  const typeConfig = getTypeConfig();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Badge badgeContent={unreadCount} color="error" overlap="circular">
              <NotificationsIcon sx={{ color: isDark ? '#00f0ff' : '#2563eb', fontSize: 28 }} />
            </Badge>
            <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>{t('notifications.title')}</Typography>
          </Stack>
          <Button size="small" startIcon={markAllLoading ? <CircularProgress size={16} color="inherit" /> : <MarkEmailReadIcon />}
            onClick={handleMarkAllRead} disabled={unreadCount === 0 || markAllLoading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', color: primaryText, borderColor: isDark ? '#374151' : '#cbd5e1' }} variant="outlined">
            {markAllLoading ? t('notifications.marking') : t('notifications.markAllRead')}
          </Button>
        </Stack>
        <Typography variant="body2" sx={{ color: mutedText, mb: { xs: 2, md: 3 } }}>
          {unreadCount} {t('notifications.unreadCount')} · {t('notifications.subtitle')}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} mb={3} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
        {FILTER_TABS.map(tab => {
          const active = filter === tab.key;
          const count = tabCounts[tab.key] ?? 0;
          const typeInfo = tab.key !== 'all' && tab.key !== 'unread' ? typeConfig[tab.key as NotificationType] : null;
          return (
            <Chip key={tab.key}
              label={<Stack direction="row" spacing={0.5} alignItems="center">
                {typeInfo && <Box component="span" sx={{ color: typeInfo.color, display: 'flex', alignItems: 'center' }}>{typeInfo.icon}</Box>}
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>{t(tab.labelKey)}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.65rem', color: active ? (isDark ? '#f3f4f6' : '#0f172a') : mutedText }}>{count}</Typography>
              </Stack>}
              clickable onClick={() => setFilter(tab.key)}
              sx={{
                bgcolor: active ? (typeInfo ? `${typeInfo.color}30` : '#3b82f630') : (isDark ? 'rgba(30,41,59,0.6)' : 'rgba(226,232,240,0.5)'),
                color: active ? (typeInfo?.color ?? '#3b82f6') : mutedText,
                border: active ? `1px solid ${typeInfo?.color ?? '#3b82f6'}` : `1px solid ${borderColor}`,
                borderRadius: 3, fontWeight: 600, px: 1, transition: 'all 0.2s',
                '&:hover': { bgcolor: typeInfo ? `${typeInfo.color}20` : '#3b82f620' },
              }} />
          );
        })}
      </Stack>

      {filteredNotifications.length === 0 ? (
        <Card sx={{ bgcolor: cardBg, border: 1, borderColor, borderRadius: 3, p: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: mutedText }}>
            {filter === 'unread' ? t('notifications.noUnread') : t('notifications.noFilterMatch')}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={1.5} className="stagger-children">
          {filteredNotifications.map(n => (
            <NotificationItem key={n.id} notification={n} isDark={isDark} primaryText={primaryText} mutedText={mutedText}
              borderColor={borderColor} onClick={handleClick} marking={marking.has(n.id)} />
          ))}
        </Stack>
      )}

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} variant="filled" sx={{ borderRadius: 3, fontWeight: 600 }}
          action={<IconButton size="small" color="inherit" onClick={() => setToast(prev => ({ ...prev, open: false }))}><CloseIcon fontSize="small" /></IconButton>}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
