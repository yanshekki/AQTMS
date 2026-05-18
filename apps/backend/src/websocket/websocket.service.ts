import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { BinanceWebsocketClient } from './clients/binance-websocket.client';
import { BybitWebsocketClient } from './clients/bybit-websocket.client';

@Injectable()
export class WebsocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebsocketService.name);

  constructor(
    private readonly binanceClient: BinanceWebsocketClient,
    private readonly bybitClient: BybitWebsocketClient,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing WebSocket connections...');
  }

  onModuleDestroy() {
    this.logger.log('Closing WebSocket connections...');
    this.binanceClient.disconnect();
    this.bybitClient.disconnect();
  }

  getBinanceClient(): BinanceWebsocketClient {
    return this.binanceClient;
  }

  getBybitClient(): BybitWebsocketClient {
    return this.bybitClient;
  }

  /**
   * Unified method to get WebSocket connection states (useful for health checks)
   */
  getConnectionStates() {
    return {
      binance: this.binanceClient.getConnectionState?.() || 'UNKNOWN',
      bybit: 'NOT_IMPLEMENTED_YET',
    };
  }
}
