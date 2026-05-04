// ── AI Signals Page (Responsive + Theme-aware) ──

import { useState } from 'react';
import {
  Container, Typography, Box, Stack, Card, CardContent, TextField, Button,
  Accordion, AccordionSummary, AccordionDetails, Chip, IconButton, InputAdornment,
} from '@mui/material';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import TelegramIcon from '@mui/icons-material/Telegram';
import TwitterIcon from '@mui/icons-material/Twitter';
import { useTranslation } from 'react-i18next';
import { SignalsTable } from '@/features/ai-signals/ui/SignalsTable';
import { DetailDrawer } from '@/features/ai-signals/ui/DetailDrawer';
import { useAISignals } from '@/features/ai-signals/model/useAISignals';
import { useThemeMode } from '@/app/Providers';

export function AISignalsPage() {
  const { signals, isLoading, error } = useAISignals();
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === 'dark';
  const primaryText = isDark ? '#f3f4f6' : '#0f172a';
  const mutedText = isDark ? '#9ca3af' : '#64748b';
  const borderColor = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.8)';

  // Data source connection state
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChannels, setTgChannels] = useState('');
  const [xBearerToken, setXBearerToken] = useState('');
  const [xUsernames, setXUsernames] = useState('');
  const [showTokens, setShowTokens] = useState({ tg: false, x: false });

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
      <Box className="fade-in-up">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={1} spacing={1}>
          <Typography variant="h5" sx={{ color: primaryText, fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
            <AutoGraphIcon sx={{ mr: 1, verticalAlign: 'middle', color: isDark ? '#00f0ff' : '#2563eb' }} />{t('aiSignals.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: mutedText, fontSize: { xs: '0.7rem', md: '0.8rem' } }}>{signals.length} {t('aiSignals.signalCount')} · {t('aiSignals.refreshRate')}</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: mutedText, mb: { xs: 2, md: 3 }, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>{t('aiSignals.description')}</Typography>
      </Box>

      {/* Data Source Connection */}
      <Accordion expanded={sourceExpanded} onChange={(_, v) => setSourceExpanded(v)}
        sx={{ bgcolor: 'transparent', border: 1, borderColor, borderRadius: 2, mb: 2, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: mutedText }} />}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" sx={{ color: primaryText, fontWeight: 700 }}>
              📡 Data Sources
            </Typography>
            <Chip label="Configure" size="small" sx={{ bgcolor: isDark ? '#1e293b' : '#e2e8f0', color: mutedText, fontSize: '0.6rem', height: 20 }} />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2.5}>
            {/* Telegram */}
            <Card sx={{ bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', border: 1, borderColor, borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                  <TelegramIcon sx={{ color: '#0088cc' }} />
                  <Typography variant="subtitle2" sx={{ color: primaryText, fontWeight: 700 }}>Telegram</Typography>
                  <Typography variant="caption" component="a" href="https://core.telegram.org/bots/api" target="_blank" sx={{ color: '#3b82f6', textDecoration: 'none', ml: 'auto' }}>
                    API Docs ↗
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  <TextField
                    size="small" fullWidth
                    type={showTokens.tg ? 'text' : 'password'}
                    value={tgBotToken} onChange={e => setTgBotToken(e.target.value)}
                    placeholder="Bot Token (from @BotFather)"
                    InputProps={{
                      endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowTokens(p => ({ ...p, tg: !p.tg }))}>{showTokens.tg ? <VisibilityOffIcon sx={{ fontSize: 16, color: mutedText }} /> : <VisibilityIcon sx={{ fontSize: 16, color: mutedText }} />}</IconButton></InputAdornment>,
                    }}
                    sx={{ input: { color: primaryText, fontSize: '0.8rem' }, '.MuiOutlinedInput-notchedOutline': { borderColor } }}
                  />
                  <TextField
                    size="small" fullWidth
                    value={tgChannels} onChange={e => setTgChannels(e.target.value)}
                    placeholder="Channel usernames (comma-separated, e.g. @crypto_signals,@defi_news)"
                    sx={{ input: { color: primaryText, fontSize: '0.8rem' }, '.MuiOutlinedInput-notchedOutline': { borderColor } }}
                  />
                  <Button variant="contained" size="small" sx={{ alignSelf: 'flex-start', borderRadius: 2, bgcolor: '#0088cc', textTransform: 'none', fontSize: '0.75rem', '&:hover': { bgcolor: '#006699' } }}>
                    Connect Telegram
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* X.com */}
            <Card sx={{ bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', border: 1, borderColor, borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                  <TwitterIcon sx={{ color: '#1da1f2' }} />
                  <Typography variant="subtitle2" sx={{ color: primaryText, fontWeight: 700 }}>X.com (Twitter)</Typography>
                  <Typography variant="caption" component="a" href="https://developer.x.com/en/docs" target="_blank" sx={{ color: '#3b82f6', textDecoration: 'none', ml: 'auto' }}>
                    API Docs ↗
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  <TextField
                    size="small" fullWidth
                    type={showTokens.x ? 'text' : 'password'}
                    value={xBearerToken} onChange={e => setXBearerToken(e.target.value)}
                    placeholder="Bearer Token (from X Developer Portal)"
                    InputProps={{
                      endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowTokens(p => ({ ...p, x: !p.x }))}>{showTokens.x ? <VisibilityOffIcon sx={{ fontSize: 16, color: mutedText }} /> : <VisibilityIcon sx={{ fontSize: 16, color: mutedText }} />}</IconButton></InputAdornment>,
                    }}
                    sx={{ input: { color: primaryText, fontSize: '0.8rem' }, '.MuiOutlinedInput-notchedOutline': { borderColor } }}
                  />
                  <TextField
                    size="small" fullWidth
                    value={xUsernames} onChange={e => setXUsernames(e.target.value)}
                    placeholder="Usernames to track (comma-separated, e.g. @cz_binance,@VitalikButerin)"
                    sx={{ input: { color: primaryText, fontSize: '0.8rem' }, '.MuiOutlinedInput-notchedOutline': { borderColor } }}
                  />
                  <Button variant="contained" size="small" sx={{ alignSelf: 'flex-start', borderRadius: 2, bgcolor: '#1da1f2', textTransform: 'none', fontSize: '0.75rem', '&:hover': { bgcolor: '#0d8bd9' } }}>
                    Connect X.com
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <SignalsTable signals={signals} isLoading={isLoading} error={error} onSelectSignal={setSelectedSignalId} />
      <DetailDrawer signalId={selectedSignalId} onClose={() => setSelectedSignalId(null)} />
    </Container>
  );
}
