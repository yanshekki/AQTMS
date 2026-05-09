import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';

@Injectable()
export class BybitWebsocketClient {
  private ws: WebSocket | null = null;
  private messageCallback?: (data: any) => void;
  private errorCallback?: (error: Error) => void;
  private closeCallback?: () => void;

  private subscribedTopics: Set<string> = new Set();

  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.BYBIT_TESTNET === 'true'
      ? 'wss://stream-testnet.bybit.com/v5/public/linear'
      : 'wss://stream.bybit.com/v5/public/linear';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.baseUrl);

      this.ws.on('open', () => {
        console.log('[BybitWebsocket] Connected');
        this.resubscribeTopics();
        resolve();
      });

      this.ws.on('message', (data: string) => {
        if (this.messageCallback) {
          try {
            const parsed = JSON.parse(data);
            this.messageCallback(parsed);
          } catch (e) {
            console.error('[BybitWebsocket] Failed to parse message');
          }
        }
      });

      this.ws.on('error', (error) => {
        console.error('[BybitWebsocket] Error:', error);
        if (this.errorCallback) this.errorCallback(error as Error);
      });

      this.ws.on('close', () => {
        console.log('[BybitWebsocket] Disconnected');
        if (this.closeCallback) this.closeCallback();
      });
    });
  }

  subscribe(topic: string) {
    this.subscribedTopics.add(topic);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        op: 'subscribe',
        args: [topic],
      };
      this.ws.send(JSON.stringify(payload));
      console.log(`[BybitWebsocket] Subscribed to ${topic}`);
    }
  }

  private resubscribeTopics() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    for (const topic of this.subscribedTopics) {
      const payload = {
        op: 'subscribe',
        args: [topic],
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  onMessage(callback: (data: any) => void): void {
    this.messageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  onClose(callback: () => void): void {
    this.closeCallback = callback;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
