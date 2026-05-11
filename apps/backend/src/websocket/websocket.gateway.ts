import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/trading',
})
@Injectable()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets = new Map<string, Socket>(); // userId -> socket

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    for (const [userId, socket] of this.userSockets.entries()) {
      if (socket.id === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('auth')
  handleAuth(client: Socket, payload: { userId: string; token?: string }) {
    const { userId } = payload;
    this.userSockets.set(userId, client);
    client.join(`user-${userId}`);
    this.logger.log(`User ${userId} authenticated and joined room`);
    return { status: 'ok', message: 'Authenticated' };
  }

  /**
   * Push real-time price update (broadcast or to room)
   */
  pushPriceUpdate(symbol: string, price: number, timestamp: number) {
    this.server.emit('price:update', { symbol, price, timestamp });
    this.logger.debug(`Broadcast price update for ${symbol}: ${price}`);
  }

  /**
   * Push order update to specific user
   */
  pushOrderUpdate(userId: string, order: any) {
    this.server.to(`user-${userId}`).emit('order:update', order);
    this.logger.debug(`Pushed order update to user ${userId}`);
  }

  /**
   * Push position update to specific user
   */
  pushPositionUpdate(userId: string, position: any) {
    this.server.to(`user-${userId}`).emit('position:update', position);
    this.logger.debug(`Pushed position update to user ${userId}`);
  }

  /**
   * Push partial fill notification
   */
  pushPartialFill(userId: string, fill: any) {
    this.server.to(`user-${userId}`).emit('order:partial-fill', fill);
  }

  /**
   * Broadcast kill switch status
   */
  broadcastKillSwitch(status: { active: boolean; reason?: string }) {
    this.server.emit('killswitch:status', status);
  }
}
