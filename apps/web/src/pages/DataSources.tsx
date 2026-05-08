// ── Data Sources Page (Improved with Connect Form) ──

import { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, Card, CardContent, Stack, Chip, IconButton, Alert, TextField, MenuItem
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
  const [showConnectForm, setShowConnectForm] = useState(false);

  // Connect form state
  const [formType, setFormType] = useState<'TELEGRAM' | 'X'>('TELEGRAM');
  const [formName, setFormName] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formChannel, setFormChannel] = useState('');
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
      await fetchDataSources();
    } catch (err: any) {
      alert(err.message || '刪除失敗');
    }
  };

  const handleConnect = async () => {
    if (!formName || !formToken) {
      alert('請填寫名稱和 Token');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const config: any = {
        token: formToken,
      };

      if (formType === 'TELEGRAM' && formChannel) {
        config.channel = formChannel;
      }

      await dataSourceApi.connectDataSource({
        type: formType,
        name: formName,
        config,
      });

      // Reset form
      setFormName('');
      setFormToken('');
      setFormChannel('');
      setShowConnectForm(false);

      await fetchDataSources();
    } catch (err: any) {
      setError(err.message || '連接失敗');
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          數據來源設定
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowConnectForm(!showConnectForm)}
        >
          連接新數據來源
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Connect Form */}
      {showConnectForm && (
        <Card sx={{ mb: 3, p: 3 }} variant="outlined">
          <Typography variant="h6" mb={2}>連接新數據來源</Typography>

          <Stack spacing={2}>
            <TextField
              select
              label="類型"
              value={formType}
              onChange={(e) => setFormType(e.target.value as 'TELEGRAM' | 'X')}
              fullWidth
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
            />

            <TextField
              label={formType === 'TELEGRAM' ? 'Bot Token' : 'Bearer Token'}
              value={formToken}
              onChange={(e) => setFormToken(e.target.value)}
              type="password"
              fullWidth
            />

            {formType === 'TELEGRAM' && (
              <TextField
                label="Channel Username（可選）"
                value={formChannel}
                onChange={(e) => setFormChannel(e.target.value)}
                placeholder="@yourchannel"
                fullWidth
              />
            )}

            <Stack direction="row" spacing={2} mt={1}>
              <Button 
                variant="outlined" 
                onClick={() => setShowConnectForm(false)}
                disabled={connecting}
              >
                取消
              </Button>
              <Button 
                variant="contained" 
                onClick={handleConnect}
                disabled={connecting || !formName || !formToken}
              >
                {connecting ? '連接中...' : '連接'}
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}

      {/* Data Sources List */}
      {loading ? (
        <Typography>載入中...</Typography>
      ) : dataSources.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            尚未連接任何數據來源
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            連接 Telegram 或 X 來開始接收訊號
          </Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {dataSources.map((source) => (
            <Card key={source.id} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={600}>
                        {source.name}
                      </Typography>
                      <Chip 
                        label={source.type} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                      <Chip 
                        label={source.status} 
                        size="small" 
                        color={getStatusColor(source.status) as any}
                      />
                    </Stack>
                    {source.lastError && (
                      <Typography variant="caption" color="error">
                        錯誤: {source.lastError}
                      </Typography>
                    )}
                  </Stack>

                  <IconButton 
                    color="error" 
                    onClick={() => handleDelete(source.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
