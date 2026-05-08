// ── Data Sources Page (MVP) ──

import { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, Card, CardContent, Stack, Chip, IconButton, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { dataSourceApi } from '@/features/data-sources/api/dataSourceApi';

import type { DataSource } from '@/features/data-sources/api/dataSourceApi';

export function DataSourcesPage() {
  const { t } = useTranslation();
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectForm, setShowConnectForm] = useState(false);

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
          onClick={() => setShowConnectForm(true)}
        >
          連接新數據來源
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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

      {/* TODO: Connect Form Modal */}
      {showConnectForm && (
        <Card sx={{ mt: 3, p: 3 }}>
          <Typography variant="h6" mb={2}>連接新數據來源（開發中）</Typography>
          <Typography color="text.secondary">
            目前支援：Telegram（開發中）
          </Typography>
          <Button sx={{ mt: 2 }} onClick={() => setShowConnectForm(false)}>
            關閉
          </Button>
        </Card>
      )}
    </Container>
  );
}
