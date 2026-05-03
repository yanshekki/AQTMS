// ── Connection Test Button ──

import { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';

interface ConnectionTestButtonProps {
  onTest: () => Promise<boolean>;
  disabled?: boolean;
}

export function ConnectionTestButton({ onTest, disabled }: ConnectionTestButtonProps) {
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const { t } = useTranslation();

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest();
      setTestResult(result);
    } catch {
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  };

  const getLabel = () => {
    if (testing) return t('exchanges.testing');
    if (testResult === true) return t('exchanges.connectedOk');
    if (testResult === false) return t('exchanges.failed');
    return t('exchanges.testConnection');
  };

  return (
    <Button
      variant="outlined"
      onClick={handleTest}
      disabled={disabled || testing}
      startIcon={
        testing ? (
          <CircularProgress size={16} color="inherit" />
        ) : testResult === true ? (
          <CheckCircleIcon sx={{ color: '#22c55e' }} />
        ) : (
          <PlayArrowIcon />
        )
      }
      sx={{
        borderColor: testResult === true ? '#22c55e' : '#374151',
        color: testResult === true ? '#22c55e' : testResult === false ? '#ef4444' : '#9ca3af',
        '&:hover': { borderColor: testResult === true ? '#22c55e' : '#6b7280' },
      }}
    >
      {getLabel()}
    </Button>
  );
}
