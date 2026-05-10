import { Module, Global } from '@nestjs/common';
import { BinanceWebsocketClient } from './clients/binance-websocket.client';
import { BybitWebsocketClient } from './clients/bybit-websocket.client';
import { WebsocketService } from './websocket.service';
import { WebsocketGateway } from './websocket.gateway';

@Global()
@Module({
  providers: [
    BinanceWebsocketClient,
    BybitWebsocketClient,
    WebsocketService,
    WebsocketGateway,
  ],
  exports: [
    WebsocketService,
    WebsocketGateway,
    BinanceWebsocketClient,
    BybitWebsocketClient,
  ],
})
export class WebsocketModule {}