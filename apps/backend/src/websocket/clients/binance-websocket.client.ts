import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';
import { IExchangeWebsocket } from '../interfaces/exchange-websocket.interface';

@Injectable()
export class BinanceWebsocketClient implements IExchangeWebsocket {
  private ws: WebSocket | null = null;
  private messageCallback?: (data: any) => void;
  private errorCallback?: (error: Error) => void;
  private closeCallback?: () => void;

  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.BINANCE_TESTNET === 'true'
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.baseUrl);

      this.ws.on('open', () => {
        console.log('[BinanceWebsocket] Connected');
        resolve();
      });

      this.ws.on('message', (data: string) => {
        if (this.messageCallback) {
          try {
            const parsed = JSON.parse(data);
            this.messageCallback(parsed);
          } catch (e) {
            console.error('[BinanceWebsocket] Failed to parse message', e);
          }
        }
      });

      this.ws.on('error', (error) => {
        console.error('[BinanceWebsocket] Error:', error);
        if (this.errorCallback) this.errorCallback(error);
      });

      this.ws.on('close', () => {
        console.log('[BinanceWebsocket] Disconnected');
        if (this.closeCallback) this.closeCallback();
      });
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  subscribePublic(stream: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[BinanceWebsocket] Not connected, cannot subscribe');
      return;
    }

    const payload = {
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now(),
    };

    this.ws.send(JSON.stringify(payload));
    console.log(`[BinanceWebsocket] Subscribed to ${stream}`);
  }

  subscribeUser(listenKey: string): void {
    // For user data stream, connect to specific listenKey endpoint
    const userStreamUrl = `${this.baseUrl.replace('/ws', '')}/ws/${listenKey}`;
    // In real implementation, you would create a separate WS connection for user data
    console.log(`[BinanceWebsocket] User data stream should connect to: ${userStreamUrl}`);
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
}
