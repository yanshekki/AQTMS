// Enhanced Dashboard with Testing Controls

import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, Alert, LinearProgress
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function Dashboard() {
  const [currentMode, setCurrentMode] = useState<'PAPER' | 'TESTNET' | 'LIVE'>('PAPER');
  const [validationResult, setValidationResult] = useState<any>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: async () => {
      const res = await axios.get('/api/portfolio/summary');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const runValidation = async () => {
    try {
      const res = await axios.post('/api/execution/validate-testing', {
        userId: 'demo-user',
        exchangeAccountId: 'demo-account'
      });
      setValidationResult(res.data);
    } catch (err) {
      setValidationResult({ ready: false, issues: ['Validation failed'] });
    }
  };

  if (isLoading) return <LinearProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Trading Dashboard
      </Typography>

      {/* Trading Mode Indicator */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Current Trading Mode</Typography>
          <Box sx={{ mt: 1 }}>
            <Chip 
              label={currentMode} 
              color={currentMode === 'PAPER' ? 'success' : currentMode === 'TESTNET' ? 'warning' : 'error'}
              sx={{ fontSize: '1rem', px: 2, py: 1 }}
            />
            {currentMode === 'LIVE' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                ⚠️ You are in LIVE mode. Real funds are at risk!
              </Alert>
            )}
            {currentMode === 'TESTNET' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Testnet mode active — using exchange test environment.
              </Alert>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => setCurrentMode('PAPER')}
              sx={{ mr: 1 }}
            >
              Switch to PAPER
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => setCurrentMode('TESTNET')}
              sx={{ mr: 1 }}
            >
              Switch to TESTNET
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              onClick={() => setCurrentMode('LIVE')}
            >
              Switch to LIVE (Careful!)
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Testing Validation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Testing Environment Validation</Typography>
          <Button variant="contained" onClick={runValidation}>
            Validate Testing Environment
          </Button>

          {validationResult && (
            <Box sx={{ mt: 2 }}>
              {validationResult.ready ? (
                <Alert severity="success">Environment is ready for testing!</Alert>
              ) : (
                <Alert severity="error">
                  Issues found:
                  <ul>
                    {validationResult.issues?.map((issue: string, i: number) => <li key={i}>{issue}</li>)}
                  </ul>
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Summary */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Total Value</Typography>
              <Typography variant="h4">${summary?.totalValue || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Unrealized PnL</Typography>
              <Typography variant="h4" color={(summary?.totalUnrealizedPnl || 0) >= 0 ? 'success.main' : 'error.main'}>
                ${summary?.totalUnrealizedPnl || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Positions</Typography>
              <Typography variant="h4">{summary?.positionCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="caption" sx={{ mt: 3, display: 'block' }}>
        Use the mode switcher above to safely test Paper → Testnet → Live flow.
      </Typography>
    </Box>
  );
}
