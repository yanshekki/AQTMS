import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { BinanceWebsocketClient } from './clients/binance-websocket.client';

@Injectable()
export class WebsocketService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly binanceClient: BinanceWebsocketClient) {}

  async onModuleInit() {
    console.log('[WebsocketService] Initializing WebSocket connections...');
    // Example: connect to Binance
    // await this.binanceClient.connect();
  }

  onModuleDestroy() {
    console.log('[WebsocketService] Closing WebSocket connections...');
    this.binanceClient.disconnect();
  }

  getBinanceClient(): BinanceWebsocketClient {
    return this.binanceClient;
  }

  // Future: add methods to subscribe to user streams, handle order updates, etc.
}
