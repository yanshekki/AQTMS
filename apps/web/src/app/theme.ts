// ── AQTMS Theme System ──
// Dark/Light mode with professional neon-digital aesthetic.

import { createTheme } from '@mui/material/styles';

// ── Dark Theme ──
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8' },
    secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#6d28d9' },
    background: {
      default: '#030712',
      paper: 'rgba(17, 24, 39, 0.8)',
    },
    text: {
      primary: '#f3f4f6',
      secondary: '#9ca3af',
    },
    divider: '#1f2937',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "SF Pro Display", system-ui, sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700 },
    button: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(16px)',
          borderRadius: 16,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'linear-gradient(135deg, rgba(17,24,39,0.9) 0%, rgba(15,23,42,0.9) 100%)',
          border: '1px solid rgba(31, 41, 55, 0.6)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
          '&:hover': { transform: 'translateY(-2px)' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 12 } } },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          borderRadius: 16,
        },
      },
    },
  },
});

// ── Light Theme ──
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb', light: '#3b82f6', dark: '#1d4ed8' },
    secondary: { main: '#7c3aed', light: '#8b5cf6', dark: '#6d28d9' },
    background: {
      default: '#f8fafc',
      paper: 'rgba(255, 255, 255, 0.9)',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "SF Pro Display", system-ui, sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700 },
    button: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(16px)',
          borderRadius: 16,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          '&:hover': { transform: 'translateY(-2px)' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 12 } } },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          borderRadius: 16,
        },
      },
    },
  },
});
