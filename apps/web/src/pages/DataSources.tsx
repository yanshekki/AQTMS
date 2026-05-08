// ── Data Sources Page (with detailed info) ──

import { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, Card, CardContent, Stack, Chip, IconButton, Alert, TextField, MenuItem, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { dataSourceApi } from '@/features/data-sources/api/dataSourceApi';

export function DataSourcesPage() {
  const { t } = useTranslation();
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConnectForm, setShowConnectForm] = useState(false);

  const [formType, setFormType] = useState<'TELEGRAM' | 'X'>('TELEGRAM');
  const [formName, setFormName] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formChannels, setFormChannels] = useState('');
  const [connecting, setConnecting] = useState(false);

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const sources = await dataSourceApi.getDataSources();
      setDataSources(sources);
    } catch (err: any) {
      setError(err.message || 'Failed to load data sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這個數據來源嗎？')) return;

    try {
      await dataSourceApi.deleteDataSource(id);
      setSuccessMessage('數據來源已刪除');
      await fetchDataSources();
    } catch (err: any) {
      setError(err.message || '刪除失敗');
    }
  };

  const handleConnect = async () => {
    if (!formName || !formToken) {
      setError('請填寫名稱和 Token');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const config: any = { token: formToken };

      if (formType === 'TELEGRAM' && formChannels.trim()) {
        const channels = formChannels.split(',').map((c) => c.trim()).filter(Boolean);
        config.channels = channels;
      }

      await dataSourceApi.connectDataSource({ type: formType, name: formName, config });

      setSuccessMessage(`「${formName}」連接成功！`);
      setFormName('');
      setFormToken('');
      setFormChannels('');
      setShowConnectForm(false);

      await fetchDataSources();
    } catch (err: any) {
      setError(err.message || '連接失敗，請檢查 Token 是否正確');
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
        <Typography variant="h5" fontWeight={700}>
          數據來源設定
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowConnectForm(!showConnectForm)}>
          連接新數據來源
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Connect Form */}
      {showConnectForm && (
        <Card sx={{ mb: 3, p: 3 }} variant="outlined">
          <Typography variant="h6" mb={2}>連接新數據來源</Typography>
          <Stack spacing={2}>
            <TextField select label="類型" value={formType} onChange={(e) => setFormType(e.target.value as any)} fullWidth>
              <MenuItem value="TELEGRAM">Telegram</MenuItem>
              <MenuItem value="X">X (Twitter)</MenuItem>
            </TextField>

            <TextField label="自訂名稱" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="例如：我的 Telegram 頻道" fullWidth />

            <TextField label={formType === 'TELEGRAM' ? 'Bot Token' : 'Bearer Token'} value={formToken} onChange={(e) => setFormToken(e.target.value)} type="password" fullWidth />

            {formType === 'TELEGRAM' && (
              <TextField
                label="Channel Username(s)（可用逗號分隔）"
                value={formChannels}
                onChange={(e) => setFormChannels(e.target.value)}
                placeholder="@channel1, @channel2"
                fullWidth
                helperText="例如：@cointelegraph, @whale_alert"
              />
            )}

            <Stack direction="row" spacing={2} mt={1}>
              <Button variant="outlined" onClick={() => setShowConnectForm(false)} disabled={connecting}>取消</Button>
              <Button variant="contained" onClick={handleConnect} disabled={connecting || !formName || !formToken}>
                {connecting ? '連接中...' : '連接'}
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}

      {/* Data Sources List with more details */}
      {loading ? (
        <Typography>載入中...</Typography>
      ) : dataSources.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">尚未連接任何數據來源</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>連接 Telegram 或 X 來開始接收訊號</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {dataSources.map((source) => {
            const channelCount = source.config?.channels?.length || (source.config?.channel ? 1 : 0);
            const usernameCount = source.config?.usernames?.length || (source.config?.username ? 1 : 0);

            return (
              <Card key={source.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={600}>{source.name}</Typography>
                        <Chip label={source.type} size="small" color="primary" variant="outlined" />
                        <Chip label={source.status} size="small" color={getStatusColor(source.status) as any} />
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

                    <IconButton color="error" onClick={() => handleDelete(source.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

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
