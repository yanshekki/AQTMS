import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';
import * as crypto from 'crypto';

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
}

@Injectable()
export class BybitWebsocketClient {
  private ws: WebSocket | null = null;
  private privateWs: WebSocket | null = null;

  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private messageCallback?: (data: any) => void;
  private errorCallback?: (error: Error) => void;
  private closeCallback?: () => void;

  private subscribedTopics: Set<string> = new Set();

  private readonly baseUrl: string;
  private readonly privateUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly logger = new Logger(BybitWebsocketClient.name);

  constructor() {
    this.baseUrl = process.env.BYBIT_TESTNET === 'true'
      ? 'wss://stream-testnet.bybit.com/v5/public/linear'
      : 'wss://stream.bybit.com/v5/public/linear';

    this.privateUrl = process.env.BYBIT_TESTNET === 'true'
      ? 'wss://stream-testnet.bybit.com/v5/private'
      : 'wss://stream.bybit.com/v5/private';

    this.apiKey = process.env.BYBIT_API_KEY || '';
    this.apiSecret = process.env.BYBIT_API_SECRET || '';
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setState(state: ConnectionState) {
    if (this.connectionState !== state) {
      this.logger.log(`Connection state changed: ${this.connectionState} -> ${state}`);
      this.connectionState = state;
    }
  }

  private scheduleReconnect(isPrivate = false): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.logger.warn(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.connectionState !== ConnectionState.CONNECTED) {
        this.connectPrivateStream().catch(err => {
          this.logger.error('Reconnect failed', err);
        });
      }
    }, delay);
  }

  /**
   * Connect to Bybit Private WebSocket (requires API Key)
   */
  async connectPrivateStream(): Promise<void> {
    this.setState(ConnectionState.CONNECTING);

    return new Promise((resolve, reject) => {
      this.privateWs = new WebSocket(this.privateUrl);

      this.privateWs.on('open', () => {
        this.setState(ConnectionState.CONNECTED);
        this.reconnectAttempts = 0;
        this.logger.log('Private stream connected, sending auth...');
        this.sendAuth();
        resolve();
      });

      this.privateWs.on('message', (data: string) => {
        try {
          const parsed = JSON.parse(data);

          if (parsed.op === 'auth') {
            if (parsed.success) {
              this.logger.log('Private stream authenticated successfully');
            } else {
              this.logger.error(`Private stream auth failed: ${JSON.stringify(parsed)}`);
            }
          }

          if (this.messageCallback) {
            this.messageCallback(parsed);
          }
        } catch (e) {
          this.logger.error('Failed to parse private message', e as Error);
        }
      });

      this.privateWs.on('error', (error: any) => {
        this.logger.error(`Private stream error: ${error?.message || error}`);
        this.setState(ConnectionState.RECONNECTING);
        if (this.errorCallback) this.errorCallback(error as Error);
        this.scheduleReconnect(true);
      });

      this.privateWs.on('close', () => {
        this.logger.warn('Private stream disconnected');
        this.setState(ConnectionState.DISCONNECTED);
        if (this.closeCallback) this.closeCallback();
        this.scheduleReconnect(true);
      });
    });
  }

  private sendAuth() {
    if (!this.privateWs || this.privateWs.readyState !== WebSocket.OPEN) return;

    const expires = Date.now() + 10000; // 10 seconds validity
    const signature = this.createPrivateSignature(expires);

    const authMessage = {
      op: 'auth',
      args: [this.apiKey, expires, signature],
    };

    this.privateWs.send(JSON.stringify(authMessage));
  }

  private createPrivateSignature(expires: number): string {
    const param = `GET/realtime${expires}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(param)
      .digest('hex');
  }

  /**
   * Subscribe to private topics after authentication (e.g. 'order', 'position', 'wallet')
   */
  subscribePrivate(topic: string) {
    if (!this.privateWs || this.privateWs.readyState !== WebSocket.OPEN) {
      this.logger.warn('Private stream not connected or not authenticated');
      return;
    }

    const payload = {
      op: 'subscribe',
      args: [topic],
    };

    this.privateWs.send(JSON.stringify(payload));
    this.logger.log(`Subscribed to private topic: ${topic}`);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    if (this.privateWs) {
      this.privateWs.removeAllListeners();
      this.privateWs.close();
      this.privateWs = null;
    }

    this.setState(ConnectionState.DISCONNECTED);
    this.logger.log('WebSocket manually disconnected');
  }
}
