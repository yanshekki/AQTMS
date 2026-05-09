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

  // ... existing connect() and other methods ...

  async connectUserStream(): Promise<void> {
    if (!this.listenKey) {
      await this.getListenKey();
    }

    const userStreamUrl = `${this.baseUrl.replace('https', 'wss').replace('/api', '')}/ws/${this.listenKey}`;

    this.userDataWs = new WebSocket(userStreamUrl);

    this.userDataWs.on('open', () => {
      console.log('[BinanceWebsocket] User Data Stream connected');
      this.startKeepAlive();
    });

    this.userDataWs.on('message', (data: string) => {
      try {
        const parsed = JSON.parse(data);

        // Auto handle listenKey expiration
        if (parsed.e === 'listenKeyExpired') {
          console.warn('[BinanceWebsocket] listenKey expired. Reconnecting user data stream...');
          this.reconnectUserDataStream();
          return;
        }

        if (this.messageCallback) {
          this.messageCallback(parsed);
        }
      } catch (e) {
        console.error('[BinanceWebsocket] Failed to parse user data message');
      }
    });

    this.userDataWs.on('error', (error) => {
      console.error('[BinanceWebsocket] User Data Stream error:', error);
      if (this.errorCallback) this.errorCallback(error as Error);
    });

    this.userDataWs.on('close', () => {
      console.log('[BinanceWebsocket] User Data Stream closed');
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
      }
      if (this.closeCallback) this.closeCallback();
    });
  }

  private async reconnectUserDataStream() {
    if (this.userDataWs) {
      this.userDataWs.close();
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.listenKey = null;
    await this.connectUserStream();
  }

  // ... keep other existing methods (connect, scheduleReconnect, etc.) ...

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
