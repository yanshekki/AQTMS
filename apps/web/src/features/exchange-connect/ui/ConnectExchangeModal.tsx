// ── Connect Exchange Modal (Theme-aware) ──

import { useState, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ApiKeyForm } from './ApiKeyForm';
import { ConnectionTestButton } from './ConnectionTestButton';
import { useThemeMode } from '@/app/Providers';
import type { ConnectExchangeForm } from '../lib/schemas';

interface ConnectExchangeModalProps { open: boolean; onClose: () => void; onConnect: (data: ConnectExchangeForm) => void; isConnecting: boolean; connectError: string | null; testConnection: (exchangeId: string) => Promise<boolean>; }

export function ConnectExchangeModal({ open, onClose, onConnect, isConnecting, connectError, testConnection }: ConnectExchangeModalProps) {
  const [savedExchangeId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const borderColor = isDark ? '#1f2937' : '#e2e8f0';

  return (
    <Dialog open={open} onClose={isConnecting ? undefined : onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: isDark ? '#111827' : '#ffffff', border: 1, borderColor, borderRadius: 3, backdropFilter: 'blur(20px)' } }}>
      <DialogTitle sx={{ color: isDark ? '#f3f4f6' : '#0f172a', fontWeight: 700, borderBottom: 1, borderColor }}>Connect Exchange</DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {connectError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{connectError.includes('invalid') || connectError.includes('permission') ? 'API Key 無效或權限不足' : connectError}</Alert>}
        <ApiKeyForm onSubmit={onConnect} disabled={isConnecting} />
        {savedExchangeId && !isConnecting && <Stack direction="row" justifyContent="center" mt={2}><ConnectionTestButton onTest={() => testConnection(savedExchangeId)} disabled={!savedExchangeId} /></Stack>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, borderTop: 1, borderColor, pt: 2 }}>
        <Button onClick={onClose} disabled={isConnecting} sx={{ color: isDark ? '#6b7280' : '#94a3b8' }}>Cancel</Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => formRef.current?.requestSubmit()} disabled={isConnecting}
          sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 3, fontWeight: 700, '&:hover': { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', transform: 'translateY(-1px)', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' } }}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
