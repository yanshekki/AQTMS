import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';
import axios from 'axios';

@Injectable()
export class BinanceWebsocketClient {
  private ws: WebSocket | null = null;
  private userDataWs: WebSocket | null = null;

  private messageCallback?: (data: any) => void;
  private errorCallback?: (error: Error) => void;
  private closeCallback?: () => void;

  private listenKey: string | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  private subscribedStreams: Set<string> = new Set();

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.BINANCE_TESTNET === 'true'
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
    this.apiKey = process.env.BINANCE_API_KEY || '';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.baseUrl);

      this.ws.on('open', () => {
        console.log('[BinanceWebsocket] Connected');
        this.reconnectAttempts = 0;
        this.resubscribeStreams();
        resolve();
      });

      this.ws.on('message', (data: string) => {
        if (this.messageCallback) {
          try {
            const parsed = JSON.parse(data);
            this.messageCallback(parsed);
          } catch (e) {
            console.error('[BinanceWebsocket] Failed to parse message');
          }
        }
      });

      this.ws.on('error', (error) => {
        console.error('[BinanceWebsocket] Error:', error);
        if (this.errorCallback) this.errorCallback(error as Error);
        this.scheduleReconnect();
      });

      this.ws.on('close', () => {
        console.log('[BinanceWebsocket] Disconnected');
        if (this.closeCallback) this.closeCallback();
        this.scheduleReconnect();
      });

      // Heartbeat ping every 30 seconds
      setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.ping();
        }
      }, 30000);
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[BinanceWebsocket] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[BinanceWebsocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  private resubscribeStreams() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    for (const stream of this.subscribedStreams) {
      const payload = {
        method: 'SUBSCRIBE',
        params: [stream],
        id: Date.now(),
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  subscribePublic(stream: string): void {
    this.subscribedStreams.add(stream);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        method: 'SUBSCRIBE',
        params: [stream],
        id: Date.now(),
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  // ... keep existing connectUserStream, getListenKey, startKeepAlive, disconnect ...

  disconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.userDataWs) {
      this.userDataWs.close();
      this.userDataWs = null;
    }
  }
}
