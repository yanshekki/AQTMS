import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { BinanceWebsocketClient } from './clients/binance-websocket.client';
import { BybitWebsocketClient } from './clients/bybit-websocket.client';

@Injectable()
export class WebsocketService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly binanceClient: BinanceWebsocketClient,
    private readonly bybitClient: BybitWebsocketClient,
  ) {}

  async onModuleInit() {
    console.log('[WebsocketService] Initializing WebSocket connections...');
  }

  onModuleDestroy() {
    console.log('[WebsocketService] Closing WebSocket connections...');
    this.binanceClient.disconnect();
    this.bybitClient.disconnect();
  }

  getBinanceClient(): BinanceWebsocketClient {
    return this.binanceClient;
  }

  getBybitClient(): BybitWebsocketClient {
    return this.bybitClient;
  }
}
