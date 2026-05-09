import { Injectable, OnModuleInit } from '@nestjs/common';

// ... other imports ...

@Injectable()
export class ExecutionService implements OnModuleInit {
  // ... existing code ...

  private async handleExecutionReport(report: any) {
    try {
      const {
        s: symbol,
        S: side,
        X: orderStatus,        // 当前订单状态
        z: cumulativeFilledQty, // 累计成交数量
        L: lastExecutedPrice,   // 最后成交价格
        i: exchangeOrderId,
        x: executionType,       // TRADE / NEW 等
      } = report;

      console.log(
        `[ExecutionService] WS Update | ${symbol} ${side} | Status: ${orderStatus} | Filled: ${cumulativeFilledQty}`
      );

      const localOrder = await this.orderService.findByExchangeOrderId(exchangeOrderId);

      if (!localOrder) {
        console.warn(`[ExecutionService] Local order not found for exchangeOrderId=${exchangeOrderId}`);
        return;
      }

      // 只在有实际成交时处理
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

      // 对于取消、拒绝等状态，直接更新
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
