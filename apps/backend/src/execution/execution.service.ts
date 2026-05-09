import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebsocketService } from '../websocket/websocket.service';

// ... other imports remain the same ...

@Injectable()
export class ExecutionService implements OnModuleInit {
  // ... existing properties and constructor ...

  async onModuleInit() {
    // 可選自動啟動 WebSocket 監聽
    // await this.startListeningToOrderUpdates();
  }

  /**
   * 開始透過 WebSocket 監聽訂單更新
   */
  async startListeningToOrderUpdates(): Promise<void> {
    try {
      const binanceClient = this.websocketService.getBinanceClient();

      await binanceClient.connectUserStream();

      binanceClient.onMessage((data: any) => {
        if (data.e === 'executionReport') {
          this.handleExecutionReport(data);
        }
      });

      console.log('[ExecutionService] WebSocket order update listener started');
    } catch (error) {
      console.error('[ExecutionService] Failed to start WebSocket listener:', error);
    }
  }

  private handleExecutionReport(report: any) {
    const {
      s: symbol,
      S: side,
      X: orderStatus,
      z: filledQuantity,
      L: lastFillPrice,
      i: exchangeOrderId,
    } = report;

    console.log(
      `[ExecutionService] WS Update | ${symbol} ${side} | Status: ${orderStatus} | Filled: ${filledQuantity}`
    );

    // TODO: 實作根據 exchangeOrderId 找到本地訂單並更新
    // 例如：
    // const localOrder = await this.findLocalOrderByExchangeId(exchangeOrderId);
    // if (localOrder) {
    //   await this.orderService.applyPartialFill(localOrder.id, ...);
    // }

    if (orderStatus === 'FILLED') {
      this.metricsCollector.recordOrder(true);
    }
  }

  // ... existing methods ...
}
