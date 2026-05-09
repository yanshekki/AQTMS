import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';
import axios from 'axios';
import { StructuredLoggerService } from '../../common/logger/logger.service';

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
}

@Injectable()
export class BinanceWebsocketClient {
  private structuredLogger = new StructuredLoggerService();

  constructor() {
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
        if (this.messageCallback) {
          try {
            const parsed = JSON.parse(data);
            this.messageCallback(parsed);
          } catch (e) {
            this.structuredLogger.error('Failed to parse WebSocket message');
          }
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

  // ... keep other methods ...
}
