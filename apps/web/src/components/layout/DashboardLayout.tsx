// ── Dashboard Layout ──

import { Outlet } from 'react-router-dom';
import { Box, Typography, Link } from '@mui/material';
import { useThemeMode } from '@/app/Providers';
import { DashboardHeader } from './DashboardHeader';

export function DashboardLayout() {
  const { mode } = useThemeMode();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: mode === 'dark' ? '#030712' : '#f8fafc',
        backgroundImage: mode === 'dark'
          ? 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 240, 255, 0.03), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139, 92, 246, 0.02), transparent)'
          : 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37, 99, 235, 0.04), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139, 92, 246, 0.03), transparent)',
      }}
    >
      <DashboardHeader />
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: 'center',
          borderTop: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)',
        }}
      >
        <Typography variant="caption" sx={{ color: mode === 'dark' ? '#4b5563' : '#94a3b8' }}>
          Powered by{' '}
          <Link
            href="https://ysk.hk/"
            target="_blank"
            rel="noopener"
            sx={{
              color: mode === 'dark' ? '#6b7280' : '#94a3b8',
              textDecoration: 'none',
              fontWeight: 600,
              '&:hover': { color: mode === 'dark' ? '#00f0ff' : '#2563eb' },
            }}
          >
            YSK Limited
          </Link>
          {' '}— Hong Kong Remote Dev Team
        </Typography>
      </Box>
    </Box>
  );
}
