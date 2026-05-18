import { Injectable, Inject, forwardRef } from '@nestjs/common';
import WebSocket from 'ws';
import { StructuredLoggerService } from '../../common/logger/logger.service';
import { MarketDataService } from '../../market-data/market-data.service';

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
}

@Injectable()
export class BinanceWebsocketClient {
  private structuredLogger = new StructuredLoggerService();
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private readonly baseUrl = 'wss://stream.binance.com:9443/ws';
  private reconnectTimer: NodeJS.Timeout | null = null;

  private messageCallback?: (data: any) => void;
  private errorCallback?: (error: Error) => void;
  private closeCallback?: () => void;

  private subscribedStreams = new Set<string>();

  constructor(
    @Inject(forwardRef(() => MarketDataService))
    private readonly marketDataService: MarketDataService,
  ) {
    this.structuredLogger.setContext('BinanceWebsocketClient');
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setState(state: ConnectionState) {
    if (this.connectionState !== state) {
      this.structuredLogger.log(`Connection state changed: ${this.connectionState} -> ${state}`);
      this.connectionState = state;
    }
  }

  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) return;

    this.setState(ConnectionState.CONNECTING);
    this.structuredLogger.log('Connecting to Binance WebSocket...');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.baseUrl);

      this.ws.on('open', () => {
        this.setState(ConnectionState.CONNECTED);
        this.reconnectAttempts = 0;
        this.resubscribeStreams();
        this.structuredLogger.log('Connected to Binance WebSocket');
        resolve();
      });

      this.ws.on('message', (data: string) => {
        try {
          const parsed = JSON.parse(data);
          this.handlePriceUpdate(parsed);

          if (this.messageCallback) {
            this.messageCallback(parsed);
          }
        } catch (e) {
          this.structuredLogger.error('Failed to parse WebSocket message');
        }
      });

      this.ws.on('error', (error: any) => {
        this.structuredLogger.error(`WebSocket error: ${error?.message || error}`);
        this.setState(ConnectionState.RECONNECTING);
        if (this.errorCallback) this.errorCallback(error as Error);
        this.scheduleReconnect();
      });

      this.ws.on('close', () => {
        this.structuredLogger.warn('WebSocket disconnected');
        this.setState(ConnectionState.DISCONNECTED);
        if (this.closeCallback) this.closeCallback();
        this.scheduleReconnect();
      });

      setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.ping();
        }
      }, 30000);
    });
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

    this.setState(ConnectionState.DISCONNECTED);
    this.structuredLogger.log('WebSocket manually disconnected');
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.structuredLogger.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.connectionState !== ConnectionState.CONNECTED) {
        this.connect().catch(err => {
          this.structuredLogger.error('Reconnect failed', err);
        });
      }
    }, delay);
  }

  subscribeToMiniTicker(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.structuredLogger.warn('WebSocket not connected, cannot subscribe yet');
      return;
    }

    const streams = symbols.map(s => `${s.toLowerCase()}@miniTicker`);
    const newStreams = streams.filter(s => !this.subscribedStreams.has(s));
    if (newStreams.length === 0) return;

    const payload = {
      method: 'SUBSCRIBE',
      params: newStreams,
      id: Date.now(),
    };

    this.ws.send(JSON.stringify(payload));
    newStreams.forEach(s => this.subscribedStreams.add(s));
    this.structuredLogger.log(`Subscribed to miniTicker: ${newStreams.join(', ')}`);
  }

  private handlePriceUpdate(parsed: any) {
    try {
      if (parsed.e === '24hrMiniTicker' || parsed.e === 'miniTicker') {
        if (parsed.s && parsed.c) {
          this.marketDataService.updatePrice(parsed.s, parseFloat(parsed.c));
        }
      }

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.s && item.c) {
            this.marketDataService.updatePrice(item.s, parseFloat(item.c));
          }
        }
      }
    } catch (error) {
      this.structuredLogger.debug('Ignored non-price WebSocket message', { error: error instanceof Error ? error.message : error });
    }
  }

  private resubscribeStreams() {
    if (this.subscribedStreams.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const streams = Array.from(this.subscribedStreams);
      const payload = {
        method: 'SUBSCRIBE',
        params: streams,
        id: Date.now(),
      };
      this.ws.send(JSON.stringify(payload));
      this.structuredLogger.log(`Resubscribed to streams: ${streams.join(', ')}`);
    }
  }
}
