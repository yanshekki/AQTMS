import { Module, Global } from '@nestjs/common';
import { BinanceWebsocketClient } from './clients/binance-websocket.client';
import { BybitWebsocketClient } from './clients/bybit-websocket.client';
import { WebsocketService } from './websocket.service';

@Global()
@Module({
  providers: [BinanceWebsocketClient, BybitWebsocketClient, WebsocketService],
  exports: [WebsocketService, BinanceWebsocketClient, BybitWebsocketClient],
})
export class WebsocketModule {}
