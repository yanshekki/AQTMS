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

  private messageCallback?: (data: any) => void;
  private errorCallback?: (error: Error) => void;
  private closeCallback?: () => void;

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
      this.structuredLogger.log('Connection state changed', { from: this.connectionState, to: state });
      this.connectionState = state;
    }
  }

  async connect(): Promise<void> {
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

          // === 新增：處理價格更新 ===
          this.handlePriceUpdate(parsed);

          if (this.messageCallback) {
            this.messageCallback(parsed);
          }
        } catch (e) {
          this.structuredLogger.error('Failed to parse WebSocket message');
        }
      });

      this.ws.on('error', (error) => {
        this.structuredLogger.error('WebSocket error', error);
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

  /**
   * 處理價格更新消息（miniTicker / ticker）
   */
  private handlePriceUpdate(parsed: any) {
    try {
      // miniTicker 单符号
      if (parsed.e === '24hrMiniTicker' || parsed.e === 'miniTicker') {
        if (parsed.s && parsed.c) {
          this.marketDataService.updatePrice(parsed.s, parseFloat(parsed.c));
        }
      }

      // 数组形式（!miniTicker@arr）
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.s && item.c) {
            this.marketDataService.updatePrice(item.s, parseFloat(item.c));
          }
        }
      }
    } catch (error) {
      // 忽略非价格消息
    }
  }

  private resubscribeStreams() {
    // TODO: 根據需要自動訂閱常用交易對
    // 例如 this.subscribeToMiniTicker(['BTCUSDT', 'ETHUSDT']);
  }

  // ... 其他方法保持不變 ...
}
