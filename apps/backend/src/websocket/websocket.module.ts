import { Module, Global } from '@nestjs/common';
import { BinanceWebsocketClient } from './clients/binance-websocket.client';
import { WebsocketService } from './websocket.service';

@Global()
@Module({
  providers: [BinanceWebsocketClient, WebsocketService],
  exports: [WebsocketService, BinanceWebsocketClient],
})
export class WebsocketModule {}
