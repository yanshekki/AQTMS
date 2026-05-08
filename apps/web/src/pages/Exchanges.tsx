// ── Exchanges Page (Final Fix) ──

import { useState } from 'react';
import {
  Container, Typography, Grid, Button, Alert, Box, CircularProgress, Stack, Card, CardContent, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { ExchangeCard } from '@/features/exchange-connect/ui/ExchangeCard';
import { ConnectExchangeModal } from '@/features/exchange-connect/ui/ConnectExchangeModal';
import { useExchangeConnection } from '@/features/exchange-connect/model/useExchangeConnection';
import { useThemeMode } from '@/app/Providers';
import type { ConnectExchangeForm } from '@/features/exchange-connect/lib/schemas';

export function ExchangesPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';

  const {
    exchanges,
    isLoading,
    error,
    connect,
    isConnecting,
    connectError,
    testConnection,
    lastConnectedId,
    resetLastConnected,
    deleteExchange,
    isDeleting,
  } = useExchangeConnection();

  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const dimText = isDark ? '#6b7280' : '#94a3b8';
  const emptyBg = isDark ? 'rgba(17,24,39,0.7)' : 'rgba(255,255,255,0.7)';
  const emptyBorder = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  const handleConnect = async (data: ConnectExchangeForm) => {
    try {
      await connect(data);
      setTimeout(() => {
        setModalOpen(false);
        resetLastConnected();
      }, 800);
    } catch (e) {
      // Error handled in hook
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    resetLastConnected();
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    try {
      await deleteExchange(id);
      return true;
    } catch (e) {
      console.error('Failed to delete exchange', e);
      return false;
    }
  };

  const handleTest = async (id: string) => {
    try {
      await testConnection(id);
    } catch (e) {
      console.error('Test connection failed', e);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          mb={1}
          spacing={1}
        >
          <Typography
            variant="h5"
            sx={{
              color: primaryText,
              fontWeight: 800,
              fontSize: { xs: '1.25rem', md: '1.5rem' },
            }}
          >
            {t('exchanges.title')}
          </Typography>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetLastConnected();
              setModalOpen(true);
            }}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: 3,
              fontWeight: 700,
              fontSize: { xs: '0.8rem', md: '0.875rem' },
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
              },
            }}
          >
            {t('exchanges.addConnection')}
          </Button>
        </Stack>

        <Typography
          variant="body2"
          sx={{
            color: mutedText,
            mb: { xs: 2, md: 4 },
            fontSize: { xs: '0.75rem', md: '0.875rem' },
          }}
        >
          {t('exchanges.description')}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {connectError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {connectError}
        </Alert>
      )}

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: '#3b82f6' }} />
        </Box>
      ) : exchanges.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: { xs: 4, md: 8 },
            borderRadius: 3,
            bgcolor: emptyBg,
            border: 1,
            borderColor: emptyBorder,
            px: 2,
          }}
        >
          <Typography variant="h6" sx={{ color: dimText, mb: 1, fontSize: { xs: '1rem', md: '1.25rem' } }}>
            {t('exchanges.noExchangeConnected')}
          </Typography>
          <Typography variant="body2" sx={{ color: mutedText, mb: 3, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
            {t('exchanges.emptyHint')}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
            sx={{ borderColor: isDark ? '#374151' : '#cbd5e1', color: mutedText, borderRadius: 3 }}
          >
            {t('exchanges.connectFirstExchange')}
          </Button>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 1.5, md: 2 }} className="stagger-children">
          {exchanges.map((account) => (
            <Grid item xs={12} sm={6} lg={4} key={account.id}>
              <ExchangeCard
                account={account}
                onDelete={handleDelete}
                onTest={handleTest}
                isDeleting={isDeleting}
                isTesting={false}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Typography variant="subtitle2" sx={{ color: mutedText, mt: 4, mb: 2, fontWeight: 700 }}>
        {t('common.comingSoon')}
      </Typography>

      <Grid container spacing={{ xs: 1.5, md: 2 }}>
        {[
          { exchange: 'FUTU', color: '#FF6B35', desc: 'Futu (富途) — Hong Kong & US stocks' },
          { exchange: 'IBKR', color: '#E8252D', desc: 'Interactive Brokers — Global equities' },
        ].map((ex) => (
          <Grid item xs={12} sm={6} lg={4} key={ex.exchange}>
            <Card sx={{ bgcolor: emptyBg, border: '1px dashed', borderColor: emptyBorder, borderRadius: 3, opacity: 0.6, transition: 'all 0.3s', '&:hover': { opacity: 0.8, borderColor: ex.color } }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: `${ex.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                  <Typography sx={{ color: ex.color, fontWeight: 900, fontSize: '1.2rem' }}>{ex.exchange[0]}</Typography>
                </Box>
                <Typography variant="subtitle1" sx={{ color: primaryText, fontWeight: 700, mb: 0.5 }}>{ex.exchange}</Typography>
                <Typography variant="caption" sx={{ color: dimText }}>{ex.desc}</Typography>
                <Chip label={t('common.comingSoon')} size="small" sx={{ mt: 1.5, bgcolor: `${ex.color}15`, color: ex.color, fontWeight: 600 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <ConnectExchangeModal
        open={modalOpen}
        onClose={handleCloseModal}
        onConnect={handleConnect}
        isConnecting={isConnecting}
        connectError={connectError}
        testConnection={testConnection}
      />
    </Container>
  );
}
