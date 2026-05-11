import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, Grid, Chip, List, ListItem, ListItemText } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export default function Strategies() {
  const queryClient = useQueryClient();
  const [newStrategy, setNewStrategy] = useState({ name: '', type: 'sma_crossover' });

  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => (await axios.get('/api/strategies')).data,
  });

  const createStrategy = useMutation({
    mutationFn: (data: any) => axios.post('/api/strategies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      setNewStrategy({ name: '', type: 'sma_crossover' });
    },
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Strategies</Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Create New Strategy</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5}>
              <TextField
                label="Strategy Name"
                value={newStrategy.name}
                onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Type"
                value={newStrategy.type}
                onChange={(e) => setNewStrategy({ ...newStrategy, type: e.target.value })}
                fullWidth
              >
                <option value="sma_crossover">SMA Crossover</option>
                <option value="mean_reversion">Mean Reversion</option>
                <option value="momentum">Momentum</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button variant="contained" fullWidth onClick={() => createStrategy.mutate(newStrategy)}>
                Create Strategy
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Your Strategies</Typography>
          {strategies.length === 0 ? (
            <Typography color="text.secondary">No strategies yet. Create one above or run backtests.</Typography>
          ) : (
            <List>
              {strategies.map((s: any) => (
                <ListItem key={s.id} divider>
                  <ListItemText 
                    primary={s.name} 
                    secondary={`Type: ${s.type} | Created: ${new Date(s.createdAt).toLocaleDateString()}`} 
                  />
                  <Chip label="Active" color="success" size="small" />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
