// ── Data Sources Page ──

import { useState, useEffect, useRef } from 'react';
import {
  Container, Typography, Box, Button, Card, CardContent, Stack, Chip, IconButton, Alert, TextField, MenuItem, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SourceIcon from '@mui/icons-material/Source';
import { dataSourceApi } from '@/features/data-sources/api/dataSourceApi';

export function DataSourcesPage() {
  const listRef = useRef<HTMLDivElement>(null);

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
  const [isReconnecting, setIsReconnecting] = useState(false); // for re-connect mode

  // Detail dialog
  const [selectedSource, setSelectedSource] = useState<any>(null);

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
      const timer = setTimeout(() => setNewlyAddedId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedId]);

  // Auto scroll to newly added source
  useEffect(() => {
    if (newlyAddedId && listRef.current) {
      setTimeout(() => {
        const newCard = document.getElementById(`source-${newlyAddedId}`);
        if (newCard) {
          newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
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
      setDataSources(prev => prev.filter(s => s.id !== deletingSource.id));
      setSuccessMessage(`已成功刪除「${deletingSource.name}」`);
      setDeleteDialogOpen(false);
      setDeletingSource(null);
      if (selectedSource?.id === deletingSource.id) setSelectedSource(null);
      setTimeout(() => fetchDataSources(false), 500);
    } catch (err: any) {
      setError(err.message || '刪除失敗，請稍後再試');
      await fetchDataSources(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeletingSource(null);
  };

  const openConnectModal = (sourceToReconnect?: any) => {
    if (sourceToReconnect) {
      // Re-connect mode
      setFormType(sourceToReconnect.type);
      setFormName(sourceToReconnect.name);
      setFormToken('');
      setFormChannels(sourceToReconnect.config?.channels?.join(', ') || '');
      setIsReconnecting(true);
    } else {
      setFormType('TELEGRAM');
      setFormName('');
      setFormToken('');
      setFormChannels('');
      setIsReconnecting(false);
    }
    setConnectModalOpen(true);
    setError(null);
  };

  const closeConnectModal = () => {
    setConnectModalOpen(false);
    setFormName('');
    setFormToken('');
    setFormChannels('');
    setError(null);
    setIsReconnecting(false);
  };

  const handleConnect = async () => {
    const trimmedName = formName.trim();
    const trimmedToken = formToken.trim();
    const trimmedChannels = formChannels.trim();

    if (!trimmedName) {
      setError('請輸入自訂名稱');
      return;
    }
    if (!trimmedToken && !isReconnecting) {
      setError(formType === 'TELEGRAM' ? '請輸入 Bot Token' : '請輸入 Bearer Token');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const config: any = { token: trimmedToken || undefined };

      if (formType === 'TELEGRAM' && trimmedChannels) {
        const channels = trimmedChannels.split(',').map((c) => c.trim()).filter(Boolean);
        config.channels = channels;
      }

      const newSource = await dataSourceApi.connectDataSource({
        type: formType,
        name: trimmedName,
        config,
      });

      setSuccessMessage(isReconnecting 
        ? `「${trimmedName}」已更新連接！` 
        : `「${trimmedName}」連接成功！`);
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

  const renderTargets = (source: any) => {
    if (source.type === 'TELEGRAM' && source.config?.channels?.length > 0) {
      const channels = source.config.channels;
      return (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {channels.slice(0, 3).map((ch: string, idx: number) => (
            <Chip key={idx} label={ch} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          ))}
          {channels.length > 3 && (
            <Chip label={`+${channels.length - 3}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          )}
        </Stack>
      );
    }

    if (source.type === 'X' && source.config?.usernames?.length > 0) {
      const usernames = source.config.usernames;
      return (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {usernames.slice(0, 3).map((u: string, idx: number) => (
            <Chip key={idx} label={`@${u}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          ))}
          {usernames.length > 3 && (
            <Chip label={`+${usernames.length - 3}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          )}
        </Stack>
      );
    }

    return null;
  };

  const openSourceDetail = (source: any) => {
    setSelectedSource(source);
  };

  const closeSourceDetail = () => {
    setSelectedSource(null);
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

        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openConnectModal()}>
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
        <Card
          sx={{
            p: { xs: 4, md: 6 },
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ mb: 2 }}>
            <SourceIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          </Box>
          <Typography variant="h6" gutterBottom>
            尚未連接任何數據來源
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
            連接 Telegram 或 X 作為數據來源，系統就會自動接收並處理相關訊號，
            幫助你更快掌握市場動態。
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openConnectModal()}
          >
            立即連接數據來源
          </Button>
        </Card>
      ) : (
        <Stack spacing={2} ref={listRef}>
          {dataSources.map((source) => {
            const isNew = source.id === newlyAddedId;

            return (
              <Card
                id={`source-${source.id}`}
                key={source.id}
                variant="outlined"
                onClick={() => openSourceDetail(source)}
                sx={{
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  ...(isNew && {
                    bgcolor: 'rgba(59, 130, 246, 0.08)',
                    borderColor: '#3b82f6',
                    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
                    animation: 'pulse 2s ease-in-out',
                  }),
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack spacing={0.8}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={600}>{source.name}</Typography>
                        <Chip label={source.type} size="small" color="primary" variant="outlined" />
                        <Chip label={source.status} size="small" color={getStatusColor(source.status) as any} />
                        {isNew && <Chip label="新加入" size="small" color="primary" />}
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        連接時間：{formatDate(source.createdAt)}　|　最後更新：{formatDate(source.lastFetchedAt)}
                      </Typography>

                      {renderTargets(source)}

                      {source.lastError && (
                        <Typography variant="caption" color="error">
                          錯誤：{source.lastError}
                        </Typography>
                      )}
                    </Stack>

                    <IconButton
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(source);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Connect / Re-connect DataSource Modal */}
      <Dialog open={connectModalOpen} onClose={closeConnectModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isReconnecting ? '更新數據來源連接' : '連接新數據來源'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            <TextField
              select
              label="類型"
              value={formType}
              onChange={(e) => setFormType(e.target.value as any)}
              fullWidth
              disabled={connecting || isReconnecting}
            >
              <MenuItem value="TELEGRAM">Telegram</MenuItem>
              <MenuItem value="X">X (Twitter)</MenuItem>
            </TextField>

            <TextField
              label="自訂名稱"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              disabled={connecting || isReconnecting}
            />

            <TextField
              label={formType === 'TELEGRAM' ? 'Bot Token（留空則保持原有）' : 'Bearer Token（留空則保持原有）'}
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
            disabled={connecting || !formName.trim()}
            startIcon={connecting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {connecting ? '連接中...' : (isReconnecting ? '更新連接' : '連接')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Source Detail Dialog */}
      <Dialog open={!!selectedSource} onClose={closeSourceDetail} maxWidth="sm" fullWidth>
        <DialogTitle>數據來源詳情</DialogTitle>
        <DialogContent>
          {selectedSource && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6">{selectedSource.name}</Typography>
                <Chip label={selectedSource.type} color="primary" variant="outlined" />
                <Chip label={selectedSource.status} color={getStatusColor(selectedSource.status) as any} />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                連接時間：{formatDate(selectedSource.createdAt)}　|　最後更新：{formatDate(selectedSource.lastFetchedAt)}
              </Typography>

              {selectedSource.lastError && (
                <Alert severity="error">
                  <Typography variant="body2" fontWeight={600}>最後錯誤</Typography>
                  <Typography variant="body2">{selectedSource.lastError}</Typography>
                </Alert>
              )}

              <Box>
                <Typography variant="subtitle2" gutterBottom>配置詳情</Typography>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {JSON.stringify(selectedSource.config, null, 2)}
                  </Typography>
                </Card>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSourceDetail}>關閉</Button>

          {selectedSource && selectedSource.status === 'ERROR' && (
            <Button
              variant="outlined"
              onClick={() => {
                closeSourceDetail();
                openConnectModal(selectedSource);
              }}
            >
              重新連接
            </Button>
          )}

          {selectedSource && (
            <Button
              color="error"
              onClick={() => {
                closeSourceDetail();
                openDeleteDialog(selectedSource);
              }}
            >
              刪除此來源
            </Button>
          )}
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
