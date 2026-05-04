// ── Dashboard Layout ──

import { Outlet } from 'react-router-dom';
import { Box, Typography, Link } from '@mui/material';
import { useThemeMode } from '@/app/Providers';
import { DashboardHeader } from './DashboardHeader';

const SIDEBAR_WIDTH = 240;

export function DashboardLayout() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <DashboardHeader />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: { md: `${SIDEBAR_WIDTH}px` },
          mt: '56px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 56px)',
          bgcolor: isDark ? '#030712' : '#f8fafc',
          backgroundImage: isDark
            ? 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 240, 255, 0.03), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139, 92, 246, 0.02), transparent)'
            : 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37, 99, 235, 0.04), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139, 92, 246, 0.03), transparent)',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Outlet />
        </Box>
        <Box
          component="footer"
          sx={{
            py: 1.5,
            textAlign: 'center',
            borderTop: '1px solid',
            borderColor: isDark ? 'rgba(30,41,59,0.3)' : 'rgba(226,232,240,0.5)',
          }}
        >
          <Typography variant="caption" sx={{ color: isDark ? '#374151' : '#cbd5e1', fontSize: '0.65rem' }}>
            Powered by{' '}
            <Link
              href="https://ysk.hk/"
              target="_blank"
              rel="noopener"
              sx={{
                color: isDark ? '#4b5563' : '#94a3b8',
                textDecoration: 'none',
                fontWeight: 600,
                '&:hover': { color: isDark ? '#00f0ff' : '#2563eb' },
              }}
            >
              YSK Limited
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
