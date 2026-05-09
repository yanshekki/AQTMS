import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';
import * as crypto from 'crypto';

@Injectable()
export class BybitWebsocketClient {
  private ws: WebSocket | null = null;
  private privateWs: WebSocket | null = null;

  private messageCallback?: (data: any) => void;
  private errorCallback?: (error: Error) => void;
  private closeCallback?: () => void;

  private subscribedTopics: Set<string> = new Set();

  private readonly baseUrl: string;
  private readonly privateUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

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

  // ... existing public stream methods ...

  /**
   * Connect to Bybit Private WebSocket (requires API Key)
   */
  async connectPrivateStream(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.privateWs = new WebSocket(this.privateUrl);

      this.privateWs.on('open', () => {
        console.log('[BybitWebsocket] Private stream connected, sending auth...');
        this.sendAuth();
        resolve();
      });

      this.privateWs.on('message', (data: string) => {
        try {
          const parsed = JSON.parse(data);

          if (parsed.op === 'auth') {
            if (parsed.success) {
              console.log('[BybitWebsocket] Private stream authenticated successfully');
            } else {
              console.error('[BybitWebsocket] Private stream auth failed:', parsed);
            }
          }

          if (this.messageCallback) {
            this.messageCallback(parsed);
          }
        } catch (e) {
          console.error('[BybitWebsocket] Failed to parse private message');
        }
      });

      this.privateWs.on('error', (error) => {
        console.error('[BybitWebsocket] Private stream error:', error);
        if (this.errorCallback) this.errorCallback(error as Error);
      });

      this.privateWs.on('close', () => {
        console.log('[BybitWebsocket] Private stream closed');
        if (this.closeCallback) this.closeCallback();
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
      console.warn('[BybitWebsocket] Private stream not connected or not authenticated');
      return;
    }

    const payload = {
      op: 'subscribe',
      args: [topic],
    };

    this.privateWs.send(JSON.stringify(payload));
    console.log(`[BybitWebsocket] Subscribed to private topic: ${topic}`);
  }

  // ... keep existing public methods and disconnect ...

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.privateWs) {
      this.privateWs.close();
      this.privateWs = null;
    }
  }
}
