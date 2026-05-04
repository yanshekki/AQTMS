// ── Dashboard Header (Clean + Professional Sidebar Layout) ──

import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Chip, Box, IconButton, Tooltip, Stack,
  Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton,
  useMediaQuery, useTheme, Divider, Avatar, Menu, MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
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
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import TuneIcon from '@mui/icons-material/Tune';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/app/Providers';
import { usePermissions } from '@/shared/lib/usePermissions';
import { ROLES, PERMISSIONS, type Role } from '@/shared/lib/permissions';
import { authAtom } from '@/store/auth';

interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
  roles?: Role[];
  requiredPermissions?: string[];
  dividerAfter?: boolean;
}

const SIDEBAR_WIDTH = 240;

export function DashboardHeader() {
  const auth = useAtomValue(authAtom);
  const setAuth = useSetAtom(authAtom);
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useThemeMode();
  const { role, hasPermission } = usePermissions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const { t, i18n } = useTranslation();

  const isDark = mode === 'dark';
  const activeColor = isDark ? '#00f0ff' : '#2563eb';
  const textColor = isDark ? '#9ca3af' : '#475569';
  const bgColor = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)';
  const borderColor = isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(226, 232, 240, 0.5)';
  const activeBg = isDark ? 'rgba(0, 240, 255, 0.08)' : 'rgba(37, 99, 235, 0.08)';
  const hoverBg = isDark ? 'rgba(0, 240, 255, 0.06)' : 'rgba(37, 99, 235, 0.04)';

  const NAV_GROUPS: NavGroup[] = [
    {
      items: [
        { path: '/dashboard',  labelKey: 'nav.dashboard',  icon: <DashboardIcon /> },
        { path: '/exchanges',  labelKey: 'nav.exchanges',  icon: <SwapHorizIcon /> },
        { path: '/portfolio',  labelKey: 'nav.portfolio',  icon: <PieChartIcon />, roles: [ROLES.TRADER, ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
        { path: '/trades',     labelKey: 'nav.trades',     icon: <ReceiptLongIcon />, roles: [ROLES.TRADER, ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
      ],
    },
    {
      items: [
        { path: '/ai-signals', labelKey: 'nav.aiSignals',  icon: <AutoGraphIcon />, roles: [ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
        { path: '/backtest',   labelKey: 'nav.backtest',   icon: <AssessmentIcon />, roles: [ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
        { path: '/risk',       labelKey: 'nav.risk',       icon: <SecurityIcon />, requiredPermissions: [PERMISSIONS.RISK_VIEW] },
      ],
    },
    {
      items: [
        { path: '/scoring-rules', labelKey: 'nav.scoringRules', icon: <TuneIcon />, requiredPermissions: [PERMISSIONS.SCORING_MANAGE] },
      ],
    },
    {
      label: 'admin',
      items: [
        { path: '/admin/users',  labelKey: 'nav.userManagement', icon: <PeopleIcon />, roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
        { path: '/admin/audit',  labelKey: 'nav.auditLog',       icon: <HistoryIcon />, roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
        { path: '/admin/system', labelKey: 'nav.systemSettings',  icon: <TuneIcon />, roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
      ],
    },
  ];

  const canAccess = (item: NavItem): boolean => {
    if (item.roles && item.roles.length > 0 && !item.roles.includes(role as Role)) return false;
    if (item.requiredPermissions && !item.requiredPermissions.every((p) => hasPermission(p))) return false;
    return true;
  };

  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(canAccess),
  })).filter(g => g.items.length > 0);

  const handleLogout = () => {
    setAuth({ isAuthenticated: false, token: null, userId: null, walletAddress: null, role: 'VIEWER', permissions: [] });
    navigate('/login');
  };

  if (!auth.isAuthenticated) return null;

  const isActive = (path: string) => location.pathname.startsWith(path);
  const roleLabel = t(`roles.${auth.role}` as any, auth.role || 'VIEWER');

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box component="img" src="/logo.svg" alt="AQTMS" sx={{ height: 36, width: 36 }} />
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2 }}>
            {t('app.name')}
          </Typography>
          <Typography variant="caption" sx={{ color: textColor, fontSize: '0.65rem' }}>
            {t('app.fullName')}
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={() => setMobileOpen(false)} sx={{ ml: 'auto', color: textColor }}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor }} />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {visibleGroups.map((group, gi) => (
          <Box key={gi}>
            {group.label && (
              <Typography variant="caption" sx={{ px: 2.5, pt: 2, pb: 0.5, display: 'block', color: textColor, fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.6rem', textTransform: 'uppercase' }}>
                {t(`nav.${group.label}`)}
              </Typography>
            )}
            <List dense disablePadding>
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton
                      onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
                      sx={{
                        mx: 1, borderRadius: 2, mb: 0.3,
                        bgcolor: active ? activeBg : 'transparent',
                        color: active ? activeColor : (isDark ? '#d1d5db' : '#334155'),
                        '&:hover': { bgcolor: hoverBg },
                      }}
                    >
                      <ListItemIcon sx={{ color: active ? activeColor : textColor, minWidth: 36 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={t(item.labelKey)}
                        primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 700 : 400 }}
                      />
                      {active && (
                        <Box sx={{ width: 3, height: 20, bgcolor: activeColor, borderRadius: 2, mr: -1 }} />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* Bottom section */}
      <Divider sx={{ borderColor }} />
      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={() => { navigate('/settings'); if (isMobile) setMobileOpen(false); }}
          sx={{ borderRadius: 2, color: isActive('/settings') ? activeColor : textColor, bgcolor: isActive('/settings') ? activeBg : 'transparent', '&:hover': { bgcolor: hoverBg } }}
        >
          <ListItemIcon sx={{ color: isActive('/settings') ? activeColor : textColor, minWidth: 36 }}>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('nav.settings')} primaryTypographyProps={{ fontSize: '0.85rem' }} />
        </ListItemButton>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5, px: 1 }}>
          <Chip label={roleLabel} size="small" sx={{ bgcolor: activeBg, color: activeColor, fontWeight: 700, fontSize: '0.65rem', flex: 1 }} />
        </Stack>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Top bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: bgColor,
          backdropFilter: 'blur(20px)',
          borderBottom: 1,
          borderColor,
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ px: { xs: 1.5, md: 2 }, minHeight: { xs: 56, md: 56 } }}>
          {isMobile ? (
            <IconButton onClick={() => setMobileOpen(true)} sx={{ color: isDark ? '#f3f4f6' : '#0f172a', mr: 1 }}>
              <MenuIcon />
            </IconButton>
          ) : (
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mr: 2 }}>
              <Box component="img" src="/logo.svg" alt="AQTMS" sx={{ height: 32, width: 32 }} />
              <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AQTMS
              </Typography>
            </Stack>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Right side controls */}
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Tooltip title={i18n.language === 'zh' ? 'English' : '中文'}>
              <IconButton onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')} size="small" sx={{ color: textColor }}>
                <LanguageIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={isDark ? 'Light' : 'Dark'}>
              <IconButton onClick={toggle} size="small" sx={{ color: isDark ? '#fbbf24' : '#475569' }}>
                {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Tooltip title={t('nav.notifications')}>
              <IconButton onClick={() => navigate('/notifications')} size="small" sx={{ color: isActive('/notifications') ? activeColor : textColor }}>
                <NotificationsIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* User avatar + menu */}
            <Box
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{ cursor: 'pointer', ml: 1 }}
            >
              <Chip
                avatar={<Avatar sx={{ bgcolor: '#3b82f6', width: 24, height: 24, fontSize: '0.7rem' }}>{auth.walletAddress?.slice(2, 4).toUpperCase()}</Avatar>}
                label={roleLabel}
                size="small"
                sx={{ bgcolor: activeBg, color: activeColor, fontWeight: 700, fontSize: '0.7rem', '& .MuiChip-avatar': { ml: 0.5 } }}
              />
            </Box>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { bgcolor: isDark ? '#1e293b' : '#ffffff', border: 1, borderColor, borderRadius: 2, mt: 1 } }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" sx={{ color: textColor, fontFamily: 'monospace', fontSize: '0.65rem' }}>
                  {auth.walletAddress?.slice(0, 8)}...{auth.walletAddress?.slice(-6)}
                </Typography>
              </Box>
              <Divider sx={{ borderColor }} />
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/settings'); }} sx={{ color: textColor, fontSize: '0.8rem' }}>
                <SettingsIcon fontSize="small" sx={{ mr: 1 }} /> {t('nav.settings')}
              </MenuItem>
              <MenuItem onClick={() => { setUserMenuAnchor(null); handleLogout(); }} sx={{ color: '#ef4444', fontSize: '0.8rem' }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> {t('auth.logout') || 'Logout'}
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, bgcolor: isDark ? '#0f172a' : '#ffffff', borderRight: 1, borderColor } }}
        >
          {sidebarContent}
        </Drawer>
        {/* Desktop permanent sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, bgcolor: isDark ? '#0f172a' : '#ffffff', borderRight: 1, borderColor, top: 56 },
          }}
          open
        >
          {sidebarContent}
        </Drawer>
      </Box>
    </>
  );
}
