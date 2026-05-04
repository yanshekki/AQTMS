// ── WebSocket Gateway (Socket.io) ──
// Real-time push for: price updates, AI signals, order state changes, risk alerts.

import type { Server as HttpServerType } from 'node:http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

let io: Server | null = null;

export function initWebSocket(server: HttpServerType, jwtSecret: string, corsOrigin: string): Server {
  io = new Server(server, {
    cors: { origin: corsOrigin },
    pingTimeout: 60_000,
    pingInterval: 25_000,
    connectTimeout: 10_000,
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, jwtSecret) as { userId: string; walletAddress: string; role: string; permissions: string[] };
      (socket as unknown as Record<string, unknown>).user = decoded;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as unknown as Record<string, unknown>).user as { userId: string };
    logger.info({ userId: user.userId }, 'WebSocket connected');
    socket.join(`user:${user.userId}`);
    socket.on('subscribe:exchange', (exchangeId: string) => { socket.join(`exchange:${exchangeId}`); });
    socket.on('subscribe:signals', () => { socket.join('signals'); });
    socket.on('subscribe:risk', () => { socket.join(`risk:${user.userId}`); });
    socket.on('ping', () => { socket.emit('pong', { timestamp: Date.now() }); });
    socket.on('disconnect', (reason) => { logger.info({ userId: user.userId, reason }, 'WS disconnected'); });
  });

  logger.info('🔌 WebSocket gateway initialized');
  return io;
}

export function emitPriceUpdate(data: { symbol: string; price: number; bid: number; ask: number; exchange: string; timestamp: number }) {
  io?.to(`exchange:${data.exchange}`).emit('price:update', data);
}

export function emitNewSignal(data: { id: string; source: string; content: string; compositeScore: number; symbol?: string; suggestedAction: string; urgency: string; timestamp: string }) {
  io?.to('signals').emit('signal:new', data);
}

export function emitOrderUpdate(data: { orderId: string; exchangeOrderId: string; symbol: string; side: string; status: string; filledQuantity: number; quantity: number; price: number | null; timestamp: string }) {
  io?.emit('order:update', data);
}

export function emitRiskAlert(data: { userId: string; type: string; severity: string; message: string; details: Record<string, unknown>; timestamp: string }) {
  io?.to(`risk:${data.userId}`).emit('risk:alert', data);
  io?.to(`user:${data.userId}`).emit('risk:alert', data);
}

export function emitPositionUpdate(data: { symbol: string; exchange: string; side: string; quantity: number; entryPrice: number; currentPrice: number; unrealizedPnl: number; timestamp: string }) {
  io?.to(`exchange:${data.exchange}`).emit('position:update', data);
}

export function getIO(): Server | null { return io; }
