import { Injectable, OnModuleInit } from '@nestjs/common';

// ... other imports ...

@Injectable()
export class ExecutionService implements OnModuleInit {
  // ... existing code ...

  private async handleExecutionReport(report: any) {
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

    // 使用 exchangeOrderId 找到本地訂單
    const localOrder = await this.orderService.findByExchangeOrderId(exchangeOrderId);

    if (localOrder) {
      if (orderStatus === 'PARTIALLY_FILLED' || orderStatus === 'FILLED') {
        await this.orderService.applyPartialFill(
          localOrder.id,
          parseFloat(filledQuantity) - localOrder.filledQuantity, // 本次新增成交量
          parseFloat(lastFillPrice),
        );
      } else {
        await this.orderService.updateOrderStatus(
          localOrder.id,
          orderStatus as any,
        );
      }
    } else {
      console.warn(`[ExecutionService] Local order not found for exchangeOrderId: ${exchangeOrderId}`);
    }

    if (orderStatus === 'FILLED') {
      this.metricsCollector.recordOrder(true);
    }
  }

  // ... existing methods ...
}
