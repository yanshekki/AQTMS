import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // assume exists

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
    // In production, authenticate via JWT handshake
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up user mapping
    for (const [userId, socket] of this.userSockets.entries()) {
      if (socket.id === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  // Example: join user room after auth
  @SubscribeMessage('auth')
  handleAuth(client: Socket, payload: { userId: string; token?: string }) {
    const { userId } = payload;
    this.userSockets.set(userId, client);
    client.join(`user-${userId}`);
    this.logger.log(`User ${userId} authenticated and joined room`);
    return { status: 'ok', message: 'Authenticated' };
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
   * Broadcast kill switch status
   */
  broadcastKillSwitch(status: { active: boolean; reason?: string }) {
    this.server.emit('killswitch:status', status);
  }

  /**
   * Push partial fill notification
   */
  pushPartialFill(userId: string, fill: any) {
    this.server.to(`user-${userId}`).emit('order:partial-fill', fill);
  }
}