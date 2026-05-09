import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebsocketService } from '../websocket/websocket.service';
import { BinanceExecutionReport } from '../websocket/types/binance-websocket.types';

// ... other imports ...

@Injectable()
export class ExecutionService implements OnModuleInit {
  // ... existing code ...

  private async handleExecutionReport(report: BinanceExecutionReport) {
    try {
      const {
        s: symbol,
        S: side,
        X: orderStatus,
        z: cumulativeFilledQty,
        L: lastExecutedPrice,
        i: exchangeOrderId,
        x: executionType,
      } = report;

      console.log(
        `[ExecutionService] WS Update | ${symbol} ${side} | Status: ${orderStatus} | Filled: ${cumulativeFilledQty}`
      );

      const localOrder = await this.orderService.findByExchangeOrderId(String(exchangeOrderId));

      if (!localOrder) {
        console.warn(`[ExecutionService] Local order not found for exchangeOrderId=${exchangeOrderId}`);
        return;
      }

      if (executionType === 'TRADE' || orderStatus === 'PARTIALLY_FILLED' || orderStatus === 'FILLED') {
        const newFilled = parseFloat(cumulativeFilledQty);
        const previousFilled = localOrder.filledQuantity || 0;
        const thisFillQty = Math.max(0, newFilled - previousFilled);

        if (thisFillQty > 0 && lastExecutedPrice) {
          await this.orderService.applyPartialFill(
            localOrder.id,
            thisFillQty,
            parseFloat(lastExecutedPrice),
          );
        }
      }

      if (['CANCELED', 'REJECTED', 'EXPIRED'].includes(orderStatus)) {
        await this.orderService.updateOrderStatus(localOrder.id, orderStatus as any);
      }

      if (orderStatus === 'FILLED') {
        this.metricsCollector.recordOrder(true);
      }
    } catch (error) {
      console.error('[ExecutionService] Error handling executionReport:', error);
    }
  }

  // ... existing methods ...
}
