import React from 'react';
import { Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function OrderHistory() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await axios.get('/api/orders');
      return res.data;
    },
  });

  if (isLoading) return <Typography>Loading orders...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Order History</Typography>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Side</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">No orders yet</TableCell>
                  </TableRow>
                ) : (
                  orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{order.symbol}</TableCell>
                      <TableCell>
                        <Chip label={order.side} color={order.side === 'BUY' ? 'success' : 'error'} size="small" />
                      </TableCell>
                      <TableCell>{order.type}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>{order.price || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={order.status} 
                          color={order.status === 'FILLED' ? 'success' : order.status === 'PENDING' ? 'warning' : 'default'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
