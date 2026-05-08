// ── Data Sources Page ──

import { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, Card, CardContent, Stack, Chip, IconButton, Alert, TextField, MenuItem, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { dataSourceApi } from '@/features/data-sources/api/dataSourceApi';

export function DataSourcesPage() {
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSource, setDeletingSource] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal states
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [formType, setFormType] = useState<'TELEGRAM' | 'X'>('TELEGRAM');
  const [formName, setFormName] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formChannels, setFormChannels] = useState('');
  const [connecting, setConnecting] = useState(false);

  const fetchDataSources = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const sources = await dataSourceApi.getDataSources();
      setDataSources(sources);
    } catch (err: any) {
      setError(err.message || 'Failed to load data sources');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  useEffect(() => {
    if (newlyAddedId) {
      const timer = setTimeout(() => setNewlyAddedId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedId]);

  const openDeleteDialog = (source: any) => {
    setDeletingSource(source);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingSource) return;

    setIsDeleting(true);

    try {
      await dataSourceApi.deleteDataSource(deletingSource.id);

      // Optimistic UI update
      setDataSources(prev => prev.filter(s => s.id !== deletingSource.id));

      setSuccessMessage(`已成功刪除「${deletingSource.name}」`);
      setDeleteDialogOpen(false);
      setDeletingSource(null);

      // Refresh in background to sync with server
      setTimeout(() => fetchDataSources(false), 500);
    } catch (err: any) {
      setError(err.message || '刪除失敗，請稍後再試');
      // If delete failed, refresh to restore correct state
      await fetchDataSources(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeletingSource(null);
  };

  const openConnectModal = () => {
    setConnectModalOpen(true);
    setError(null);
  };

  const closeConnectModal = () => {
    setConnectModalOpen(false);
    setFormName('');
    setFormToken('');
    setFormChannels('');
    setError(null);
  };

  const handleConnect = async () => {
    const trimmedName = formName.trim();
    const trimmedToken = formToken.trim();
    const trimmedChannels = formChannels.trim();

    if (!trimmedName) {
      setError('請輸入自訂名稱');
      return;
    }
    if (!trimmedToken) {
      setError(formType === 'TELEGRAM' ? '請輸入 Bot Token' : '請輸入 Bearer Token');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const config: any = { token: trimmedToken };

      if (formType === 'TELEGRAM' && trimmedChannels) {
        const channels = trimmedChannels.split(',').map((c) => c.trim()).filter(Boolean);
        config.channels = channels;
      }

      const newSource = await dataSourceApi.connectDataSource({
        type: formType,
        name: trimmedName,
        config,
      });

      setSuccessMessage(`「${trimmedName}」連接成功！`);
      setNewlyAddedId(newSource.id);

      closeConnectModal();
      await fetchDataSources(false);
    } catch (err: any) {
      const message = err.message || '';
      if (message.includes('token') || message.includes('Token')) {
        setError('Token 無效或已過期，請檢查後重試');
      } else if (message.includes('channel') || message.includes('Channel')) {
        setError('Channel 用戶名無效或無法訪問');
      } else {
        setError(message || '連接失敗，請檢查 Token 是否正確');
      }
    } finally {
      setConnecting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED': return 'success';
      case 'ERROR': return 'error';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h5" fontWeight={700}>
            數據來源設定
          </Typography>
          <IconButton onClick={() => fetchDataSources()} disabled={loading} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Button variant="contained" startIcon={<AddIcon />} onClick={openConnectModal}>
          連接新數據來源
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Data Sources List */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : dataSources.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">尚未連接任何數據來源</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>連接 Telegram 或 X 來開始接收訊號</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {dataSources.map((source) => {
            const isNew = source.id === newlyAddedId;
            const channelCount = source.config?.channels?.length || (source.config?.channel ? 1 : 0);
            const usernameCount = source.config?.usernames?.length || (source.config?.username ? 1 : 0);

            return (
              <Card
                key={source.id}
                variant="outlined"
                sx={{
                  transition: 'all 0.3s ease',
                  ...(isNew && {
                    bgcolor: 'rgba(59, 130, 246, 0.08)',
                    borderColor: '#3b82f6',
                    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
                  }),
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={600}>{source.name}</Typography>
                        <Chip label={source.type} size="small" color="primary" variant="outlined" />
                        <Chip label={source.status} size="small" color={getStatusColor(source.status) as any} />
                        {isNew && <Chip label="新加入" size="small" color="primary" />}
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        連接時間：{formatDate(source.createdAt)}　|　最後更新：{formatDate(source.lastFetchedAt)}
                      </Typography>

                      {(channelCount > 0 || usernameCount > 0) && (
                        <Typography variant="caption" color="text.secondary">
                          {source.type === 'TELEGRAM' && `已連接 ${channelCount} 個 Channel`}
                          {source.type === 'X' && `已追蹤 ${usernameCount} 個用戶`}
                        </Typography>
                      )}

                      {source.lastError && <Typography variant="caption" color="error">錯誤：{source.lastError}</Typography>}
                    </Stack>

                    <IconButton color="error" onClick={() => openDeleteDialog(source)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Connect DataSource Modal */}
      <Dialog open={connectModalOpen} onClose={closeConnectModal} maxWidth="sm" fullWidth>
        <DialogTitle>連接新數據來源</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            <TextField
              select
              label="類型"
              value={formType}
              onChange={(e) => setFormType(e.target.value as any)}
              fullWidth
              disabled={connecting}
            >
              <MenuItem value="TELEGRAM">Telegram</MenuItem>
              <MenuItem value="X">X (Twitter)</MenuItem>
            </TextField>

            <TextField
              label="自訂名稱"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="例如：我的 Telegram 頻道"
              fullWidth
              disabled={connecting}
            />

            <TextField
              label={formType === 'TELEGRAM' ? 'Bot Token' : 'Bearer Token'}
              value={formToken}
              onChange={(e) => setFormToken(e.target.value)}
              type="password"
              fullWidth
              disabled={connecting}
            />

            {formType === 'TELEGRAM' && (
              <TextField
                label="Channel Username(s)（可用逗號分隔）"
                value={formChannels}
                onChange={(e) => setFormChannels(e.target.value)}
                placeholder="@channel1, @channel2"
                fullWidth
                disabled={connecting}
                helperText="例如：@cointelegraph, @whale_alert"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConnectModal} disabled={connecting}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={connecting || !formName.trim() || !formToken.trim()}
            startIcon={connecting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {connecting ? '連接中...' : '連接'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除「<strong>{deletingSource?.name}</strong>」嗎？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            刪除後將停止該數據來源的訊號接收。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={isDeleting}>取消</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? '刪除中...' : '確認刪除'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
}
