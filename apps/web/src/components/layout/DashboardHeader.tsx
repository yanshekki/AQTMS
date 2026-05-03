// ── Dashboard Header (Responsive + Theme-aware + Permission-filtered) ──

import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Chip, Box, IconButton, Tooltip, Stack,
  Drawer, List, ListItem, ListItemIcon, ListItemText, useMediaQuery, useTheme,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import PieChartIcon from '@mui/icons-material/PieChart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import { usePermissions } from '@/shared/lib/usePermissions';
import { ROLES, PERMISSIONS, type Role, type Permission } from '@/shared/lib/permissions';
import { authAtom } from '@/store/auth';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
  roles?: Role[];
  requiredPermissions?: Permission[];
}

export function DashboardHeader() {
  const auth = useAtomValue(authAtom);
  const setAuth = useSetAtom(authAtom);
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useThemeMode();
  const { role, hasPermission } = usePermissions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const isDark = mode === 'dark';
  const activeColor = isDark ? '#00f0ff' : '#2563eb';
  const textColor = isDark ? '#9ca3af' : '#475569';
  const bgColor = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)';
  const borderColor = isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(226, 232, 240, 0.5)';
  const activeBg = isDark ? 'rgba(0, 240, 255, 0.08)' : 'rgba(37, 99, 235, 0.08)';
  const hoverBg = isDark ? 'rgba(0, 240, 255, 0.12)' : 'rgba(37, 99, 235, 0.12)';

  const NAV_ITEMS: NavItem[] = [
    { path: '/dashboard',  labelKey: 'nav.dashboard',   icon: <DashboardIcon /> },
    { path: '/exchanges',  labelKey: 'nav.exchanges',   icon: <SwapHorizIcon />,   roles: [ROLES.TRADER, ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { path: '/ai-signals', labelKey: 'nav.aiSignals',  icon: <AutoGraphIcon />,   roles: [ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { path: '/backtest',   labelKey: 'nav.backtest',    icon: <AssessmentIcon />,  roles: [ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
  ];

  const SECONDARY_ITEMS: NavItem[] = [
    { path: '/risk',         labelKey: 'nav.risk',          icon: <SecurityIcon />,      requiredPermissions: [PERMISSIONS.RISK_VIEW] },
    { path: '/portfolio',    labelKey: 'nav.portfolio',     icon: <PieChartIcon />,       roles: [ROLES.TRADER, ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { path: '/trades',       labelKey: 'nav.trades',        icon: <ReceiptLongIcon />,    roles: [ROLES.TRADER, ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { path: '/notifications',labelKey: 'nav.notifications',  icon: <NotificationsIcon /> },
  ];

  const ADMIN_ITEMS: NavItem[] = [
    { path: '/admin/users',  labelKey: 'nav.userManagement', icon: <PeopleIcon />,   roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { path: '/admin/audit',  labelKey: 'nav.auditLog',       icon: <HistoryIcon />,  roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { path: '/admin/system', labelKey: 'nav.systemSettings',  icon: <TuneIcon />,     roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
  ];

  const ICON_ITEMS: NavItem[] = [
    { path: '/settings',       labelKey: 'nav.settings',       icon: <SettingsIcon /> },
    { path: '/admin/users',    labelKey: 'nav.adminPanel',    icon: <AdminPanelSettingsIcon />, roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
  ];

  const canAccess = (item: NavItem): boolean => {
    if (item.roles && item.roles.length > 0) {
      if (!item.roles.includes(role as Role)) return false;
    }
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      if (!item.requiredPermissions.every((p) => hasPermission(p))) return false;
    }
    return true;
  };

  const visibleNavItems = NAV_ITEMS.filter(canAccess);
  const visibleSecondaryItems = SECONDARY_ITEMS.filter(canAccess);
  const visibleAdminItems = ADMIN_ITEMS.filter(canAccess);
  const visibleIconItems = ICON_ITEMS.filter(canAccess);

  const handleLogout = () => {
    setAuth({ isAuthenticated: false, token: null, userId: null, walletAddress: null, role: 'VIEWER', permissions: [] });
    navigate('/login');
  };

  const handleLangToggle = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
  };

  if (!auth.isAuthenticated) return null;

  const isActive = (path: string) => location.pathname === path;

  const roleLabel = t(`roles.${auth.role}` as any, auth.role || 'VIEWER');

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: bgColor, backdropFilter: 'blur(20px)', borderBottom: 1, borderColor }}>
        <Toolbar sx={{ gap: { xs: 1, md: 2 }, px: { xs: 1.5, md: 3 } }}>
          {isMobile && (
            <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: isDark ? '#f3f4f6' : '#0f172a' }}>
              <MenuIcon />
            </IconButton>
          )}

          <Stack direction="row" alignItems="center" spacing={1} onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer', mr: { xs: 0, md: 2 }, flexShrink: 0 }}>
            <Box component="img" src="/logo.svg" alt="AQTMS" sx={{ height: { xs: 28, md: 36 }, width: { xs: 28, md: 36 } }} />
            {!isMobile && (
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { md: '1.15rem', lg: '1.25rem' }, background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
                {t('app.name')}
              </Typography>
            )}
          </Stack>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1, alignItems: 'center' }}>
              {visibleNavItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Button key={item.path} color="inherit" startIcon={item.icon} onClick={() => navigate(item.path)}
                    sx={{ color: active ? activeColor : textColor, bgcolor: active ? activeBg : 'transparent', borderRadius: 3, px: { md: 1.5, lg: 2 }, fontSize: '0.8rem', fontWeight: active ? 700 : 500, transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: hoverBg, color: activeColor, transform: 'none', boxShadow: 'none' }, display: { xs: 'none', lg: 'inline-flex' } }}>
                    {t(item.labelKey)}
                  </Button>
                );
              })}
              {visibleSecondaryItems.length > 0 && visibleNavItems.length > 0 && (
                <Box sx={{ width: 1, height: 20, bgcolor: borderColor, mx: 1 }} />
              )}
              {visibleSecondaryItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Button key={item.path} color="inherit" onClick={() => navigate(item.path)}
                    sx={{ color: active ? activeColor : textColor, bgcolor: active ? activeBg : 'transparent', borderRadius: 3, px: 1.2, fontSize: '0.75rem', fontWeight: active ? 600 : 400, minWidth: 'auto', transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: hoverBg, color: activeColor }, display: { xs: 'none', xl: 'inline-flex' } }}>
                    {t(item.labelKey)}
                  </Button>
                );
              })}
            </Box>
          )}

          {isMobile && <Box sx={{ flexGrow: 1 }} />}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 } }}>
            {!isMobile && visibleIconItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Tooltip key={item.path} title={t(item.labelKey)}>
                  <IconButton size="small" onClick={() => navigate(item.path)}
                    sx={{ color: active ? activeColor : textColor, bgcolor: active ? activeBg : 'transparent', transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: hoverBg, color: activeColor } }}>
                    {item.icon}
                  </IconButton>
                </Tooltip>
              );
            })}

            <Tooltip title={i18n.language === 'zh' ? 'English' : '中文'}>
              <IconButton onClick={handleLangToggle} size="small" sx={{ color: textColor, fontSize: '1.1rem', transition: 'all 0.2s ease', '&:hover': { color: activeColor } }}>
                {i18n.language === 'zh' ? '🇬🇧' : '🇭🇰'}
              </IconButton>
            </Tooltip>

            <Tooltip title={isDark ? t('settings.switchToLight') : t('settings.switchToDark')}>
              <IconButton onClick={toggle} size="small" sx={{ color: isDark ? '#fbbf24' : '#475569', transition: 'all 0.3s ease', '&:hover': { transform: 'rotate(180deg)' } }}>
                {isDark ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {!isMobile && (
              <>
                <Chip label={roleLabel} size="small" sx={{ bgcolor: activeBg, color: activeColor, fontWeight: 700, fontSize: '0.7rem' }} />
                <Typography variant="caption" sx={{ color: isDark ? '#6b7280' : '#94a3b8', fontFamily: 'monospace', display: { xs: 'none', sm: 'inline' } }}>
                  {auth.walletAddress?.slice(0, 6)}...{auth.walletAddress?.slice(-4)}
                </Typography>
              </>
            )}
            <Tooltip title={t('auth.connectWallet')}>
              <IconButton onClick={handleLogout} size="small" sx={{ color: isDark ? '#6b7280' : '#94a3b8' }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 260, bgcolor: isDark ? '#0f172a' : '#ffffff', borderRight: 1, borderColor } }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box component="img" src="/logo.svg" alt="AQTMS" sx={{ height: 32, width: 32 }} />
            <Typography sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('app.name')}
            </Typography>
          </Stack>
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: textColor }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor }} />

        <List>
          {visibleNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <ListItem key={item.path} onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                sx={{ cursor: 'pointer', bgcolor: active ? activeBg : 'transparent', '&:hover': { bgcolor: hoverBg } }}>
                <ListItemIcon sx={{ color: active ? activeColor : textColor, minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={t(item.labelKey)} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: active ? 700 : 500, color: active ? activeColor : (isDark ? '#d1d5db' : '#334155') }} />
              </ListItem>
            );
          })}
        </List>

        {visibleSecondaryItems.length > 0 && (
          <>
            <Divider sx={{ borderColor }} />
            <List>
              {visibleSecondaryItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <ListItem key={item.path} onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                    sx={{ cursor: 'pointer', bgcolor: active ? activeBg : 'transparent', '&:hover': { bgcolor: hoverBg } }}>
                    <ListItemIcon sx={{ color: active ? activeColor : textColor, minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={t(item.labelKey)} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400, color: active ? activeColor : (isDark ? '#d1d5db' : '#334155') }} />
                  </ListItem>
                );
              })}
            </List>
          </>
        )}

        {visibleAdminItems.length > 0 && (
          <>
            <Divider sx={{ borderColor }} />
            <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: textColor, fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.65rem' }}>
              {t('nav.admin').toUpperCase()}
            </Typography>
            <List>
              {visibleAdminItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <ListItem key={item.path} onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                    sx={{ cursor: 'pointer', bgcolor: active ? activeBg : 'transparent', '&:hover': { bgcolor: hoverBg } }}>
                    <ListItemIcon sx={{ color: active ? activeColor : textColor, minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={t(item.labelKey)} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400, color: active ? activeColor : (isDark ? '#d1d5db' : '#334155') }} />
                  </ListItem>
                );
              })}
            </List>
          </>
        )}

        <Box sx={{ flexGrow: 1 }} />
        <Divider sx={{ borderColor }} />
        <List>
          <ListItem onClick={() => { navigate('/settings'); setDrawerOpen(false); }}
            sx={{ cursor: 'pointer', bgcolor: isActive('/settings') ? activeBg : 'transparent', '&:hover': { bgcolor: hoverBg } }}>
            <ListItemIcon sx={{ color: isActive('/settings') ? activeColor : textColor, minWidth: 36 }}><SettingsIcon /></ListItemIcon>
            <ListItemText primary={t('nav.settings')} primaryTypographyProps={{ fontSize: '0.85rem', color: isActive('/settings') ? activeColor : (isDark ? '#d1d5db' : '#334155') }} />
          </ListItem>
        </List>

        <Box sx={{ p: 2 }}>
          <Chip label={roleLabel} size="small" sx={{ bgcolor: activeBg, color: activeColor, fontWeight: 700, mb: 1 }} />
          <Typography variant="caption" sx={{ color: isDark ? '#6b7280' : '#94a3b8', display: 'block', fontFamily: 'monospace' }}>
            {auth.walletAddress?.slice(0, 8)}...{auth.walletAddress?.slice(-6)}
          </Typography>
        </Box>
      </Drawer>
    </>
  );
}
