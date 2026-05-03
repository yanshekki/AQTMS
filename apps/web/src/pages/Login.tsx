// ── Login Page ──

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { Container, Card, CardContent, Typography, Button, Alert, CircularProgress, Box, Stack } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { useTranslation } from 'react-i18next';
import { requestChallenge, authenticate } from '@/shared/api/authApi';
import { authAtom } from '@/store/auth';
import { useThemeMode } from '@/app/Providers';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useSetAtom(authAtom);
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!window.ethereum) {
        setError(t('auth.noWallet'));
        setLoading(false);
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts?.[0]) {
        throw new Error(t('auth.noAccount'));
      }

      const address = accounts[0].toLowerCase();
      setWalletAddress(address);

      const message = await requestChallenge(address);

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      }) as string;

      const authData = await authenticate(address, signature);

      setAuth({
        isAuthenticated: true,
        token: authData.token,
        userId: authData.user.id,
        walletAddress: authData.user.walletAddress,
        role: authData.user.role,
        permissions: authData.user.permissions,
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : t('auth.walletLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: mode === 'dark'
          ? 'linear-gradient(135deg, #030712 0%, #0f172a 30%, #1a1040 60%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 30%, #f0f4ff 60%, #f8fafc 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 15s ease infinite',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(${mode === 'dark' ? 'rgba(0,240,255,0.03)' : 'rgba(37,99,235,0.04)'} 1px, transparent 1px), linear-gradient(90deg, ${mode === 'dark' ? 'rgba(0,240,255,0.03)' : 'rgba(37,99,235,0.04)'} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.5,
        }}
      />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Box className="fade-in-up">
          <Card
            sx={{
              bgcolor: mode === 'dark' ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: 1,
              borderColor: mode === 'dark' ? 'rgba(31, 41, 55, 0.6)' : 'rgba(226, 232, 240, 0.8)',
              borderRadius: 4,
              boxShadow: mode === 'dark'
                ? '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 80px rgba(0, 240, 255, 0.05)'
                : '0 20px 60px rgba(0, 0, 0, 0.06), 0 0 40px rgba(37, 99, 235, 0.04)',
            }}
          >
            <CardContent sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center' }}>
              <Box
                component="img"
                src="/logo.svg"
                alt="AQTMS"
                className="float"
                sx={{ width: 100, height: 100, mb: 2, display: 'block', mx: 'auto' }}
              />

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                {t('auth.loginTitle')}
              </Typography>
              <Typography variant="body2" sx={{ color: mode === 'dark' ? '#9ca3af' : '#64748b', mb: 1 }}>
                {t('auth.loginSubtitle')}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'inline-block',
                  bgcolor: mode === 'dark' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(37, 99, 235, 0.08)',
                  color: mode === 'dark' ? '#00f0ff' : '#2563eb',
                  px: 2, py: 0.5,
                  borderRadius: 2,
                  mb: 4,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                {t('auth.versionBadge')}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3, textAlign: 'left', borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                onClick={connectWallet}
                disabled={loading}
                sx={{
                  py: 1.75,
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 30px rgba(59, 130, 246, 0.3)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {loading ? t('auth.connecting') : t('auth.connectWallet')}
              </Button>

              {walletAddress && (
                <Typography variant="caption" sx={{ color: mode === 'dark' ? '#6b7280' : '#94a3b8', mt: 2, display: 'block', fontFamily: 'monospace' }}>
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </Typography>
              )}

              <Stack direction="row" justifyContent="center" spacing={1} mt={3}>
                {[
                  { key: 'metamask', label: t('auth.walletLabels.metamask') },
                  { key: 'brave', label: t('auth.walletLabels.brave') },
                  { key: 'walletConnect', label: t('auth.walletLabels.walletConnect') },
                  { key: 'coinbase', label: t('auth.walletLabels.coinbase') },
                ].map((wallet) => (
                  <Typography
                    key={wallet.key}
                    variant="caption"
                    sx={{
                      color: mode === 'dark' ? '#374151' : '#cbd5e1',
                      fontSize: '0.6rem',
                      fontWeight: 500,
                    }}
                  >
                    {wallet.label}
                  </Typography>
                ))}
              </Stack>

              <Typography variant="caption" sx={{ color: mode === 'dark' ? '#374151' : '#cbd5e1', mt: 3, display: 'block' }}>
                {t('auth.noGasFees')}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, cb: (...args: unknown[]) => void) => void;
      removeListener: (event: string, cb: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
