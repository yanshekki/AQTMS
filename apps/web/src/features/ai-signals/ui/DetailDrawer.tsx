// ── Detail Drawer ──

import { Drawer, Typography, Box, IconButton, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface DetailDrawerProps {
  signalId: string | null;
  onClose: () => void;
}

export function DetailDrawer({ signalId, onClose }: DetailDrawerProps) {
  if (!signalId) return null;

  return (
    <Drawer anchor="right" open={!!signalId} onClose={onClose}>
      <Box sx={{ width: 400, p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>Signal Details</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={24} />
        </Box>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Loading signal {signalId}...
        </Typography>
      </Box>
    </Drawer>
  );
}
