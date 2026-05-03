// ── Dashboard Layout ──

import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { useThemeMode } from '@/app/Providers';
import { DashboardHeader } from './DashboardHeader';

export function DashboardLayout() {
  const { mode } = useThemeMode();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: mode === 'dark' ? '#030712' : '#f8fafc',
        backgroundImage: mode === 'dark'
          ? 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 240, 255, 0.03), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139, 92, 246, 0.02), transparent)'
          : 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37, 99, 235, 0.04), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139, 92, 246, 0.03), transparent)',
      }}
    >
      <DashboardHeader />
      <Outlet />
    </Box>
  );
}
