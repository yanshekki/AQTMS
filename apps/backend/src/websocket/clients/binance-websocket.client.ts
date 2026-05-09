import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';
import axios from 'axios';

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
}

@Injectable()
export class BinanceWebsocketClient {
  private ws: WebSocket | null = null;
  private userDataWs: WebSocket | null = null;

  private messageCallback?: (data: any) => void;
  private errorCallback?: (error: Error) => void;
  private closeCallback?: () => void;

  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
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

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setState(state: ConnectionState) {
    if (this.connectionState !== state) {
      console.log(`[BinanceWebsocket] State changed: ${this.connectionState} -> ${state}`);
      this.connectionState = state;
    }
  }

  async connect(): Promise<void> {
    this.setState(ConnectionState.CONNECTING);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.baseUrl);

      this.ws.on('open', () => {
        this.setState(ConnectionState.CONNECTED);
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
        this.setState(ConnectionState.RECONNECTING);
        if (this.errorCallback) this.errorCallback(error as Error);
        this.scheduleReconnect();
      });

      this.ws.on('close', () => {
        console.log('[BinanceWebsocket] Disconnected');
        this.setState(ConnectionState.DISCONNECTED);
        if (this.closeCallback) this.closeCallback();
        this.scheduleReconnect();
      });

      // Heartbeat
      setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.ping();
        }
      }, 30000);
    });
  }

  // ... keep scheduleReconnect, resubscribeStreams, subscribePublic, etc. ...

  disconnect(): void {
    this.setState(ConnectionState.DISCONNECTED);
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
