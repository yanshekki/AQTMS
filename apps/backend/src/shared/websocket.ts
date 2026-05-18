import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

interface AuthenticatedSocketUser {
  userId: string;
  email: string;
}

export function setupWebSocket(io: SocketIOServer, jwtSecret: string) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, jwtSecret) as AuthenticatedSocketUser;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as AuthenticatedSocketUser;
    logger.info({ userId: user.userId }, 'WebSocket connected');
    socket.join(`user:${user.userId}`);
    socket.on('subscribe:exchange', (exchangeId: string) => { socket.join(`exchange:${exchangeId}`); });
    socket.on('subscribe:signals', () => { socket.join('signals'); });
    socket.on('subscribe:risk', () => { socket.join(`risk:${user.userId}`); });
    socket.on('ping', () => { socket.emit('pong', { timestamp: Date.now() }); });
  });
}
