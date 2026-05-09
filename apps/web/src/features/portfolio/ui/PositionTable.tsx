import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
} from '@mui/material';
import type { Position } from '../model/usePortfolio';

interface PositionTableProps {
  positions: Position[];
  isLoading?: boolean;
}

export function PositionTable({ positions, isLoading = false }: PositionTableProps) {
  if (isLoading) {
    return <Typography variant="body2" color="text.secondary">載入中...</Typography>;
  }

  if (positions.length === 0) {
    return <Typography variant="body2" color="text.secondary">目前沒有持倉</Typography>;
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><strong>交易對</strong></TableCell>
            <TableCell><strong>交易所</strong></TableCell>
            <TableCell align="center"><strong>方向</strong></TableCell>
            <TableCell align="right"><strong>數量</strong></TableCell>
            <TableCell align="right"><strong>平均成本</strong></TableCell>
            <TableCell align="right"><strong>未實現盈虧</strong></TableCell>
            <TableCell align="center"><strong>模式</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {positions.map((pos, index) => {
            const pnlColor = pos.unrealizedPnl >= 0 ? '#22c55e' : '#ef4444';

            return (
              <TableRow key={index} hover>
                <TableCell><strong>{pos.symbol}</strong></TableCell>
                <TableCell>{pos.exchange}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={pos.side}
                    size="small"
                    color={pos.side === 'BUY' ? 'success' : 'error'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">{pos.quantity}</TableCell>
                <TableCell align="right">{pos.averagePrice.toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ color: pnlColor, fontWeight: 600 }}>
                  {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)}
                  <br />
                  <Typography variant="caption" sx={{ color: pnlColor }}>
                    ({pos.unrealizedPnlPercent.toFixed(2)}%)
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={pos.isPaper ? 'PAPER' : 'LIVE'}
                    size="small"
                    color={pos.isPaper ? 'warning' : 'default'}
                    variant={pos.isPaper ? 'outlined' : 'filled'}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
