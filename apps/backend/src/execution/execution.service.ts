import { Injectable, OnModuleInit } from '@nestjs/common';

// ... other imports remain ...

@Injectable()
export class ExecutionService implements OnModuleInit {
  // ... existing code ...

  async placeOrderWithProtection(dto: PlaceOrderWithProtectionDto & { isPaperTrading?: boolean }) {
    try {
      // ... existing Kill Switch + Risk Check logic ...

      if (dto.isPaperTrading) {
        return this.paperTradingService.placePaperOrder({ /* ... */ });
      }

      // Create local order record first
      const mainOrderRecord = this.orderService.createOrder({
        userId: dto.userId,
        exchange: dto.exchange,
        symbol: dto.symbol,
        side: dto.side,
        type: 'MARKET',
        quantity: dto.quantity,
        price: dto.price,
      });

      const adapterParams: PlaceOrderParams = {
        symbol: dto.symbol,
        side: dto.side,
        type: 'MARKET',
        quantity: dto.quantity,
        price: dto.price,
      };

      // Place order via exchange
      const mainOrderResult = await this.circuitBreaker.execute(() =>
        retry(
          () => this.exchangeService.placeOrder(adapterParams),
          {
            retries: 3,
            delay: 1000,
            shouldRetry: (error) => this.isTransientError(error),
            onRetry: () => this.metricsCollector.recordRetry(),
          },
        ),
      );

      // === 關鍵：把交易所返回的 orderId 存回本地訂單 ===
      if (mainOrderResult.exchangeOrderId || mainOrderResult.orderId) {
        await this.orderService.updateOrderStatus(
          mainOrderRecord.id,
          mainOrderRecord.status as any, // 保持原本狀態
          undefined,
          undefined,
          mainOrderResult.exchangeOrderId || mainOrderResult.orderId, // 存 exchangeOrderId
        );
      }

      // 更新成交狀態
      await this.orderService.updateOrderStatus(
        mainOrderRecord.id,
        'FILLED' as any,
        mainOrderResult.filledQuantity || dto.quantity,
        mainOrderResult.averagePrice || dto.price,
      );

      this.metricsCollector.recordOrder(true);

      return {
        success: true,
        mode: 'LIVE',
        mainOrder: mainOrderResult,
        mainOrderRecord,
      };
    } catch (error) {
      this.metricsCollector.recordOrder(false);
      this.logger.logError({
        action: 'ORDER_FAILED',
        userId: dto.userId,
        error: error instanceof Error ? error.message : '',
      });
      if (error instanceof RiskCheckFailedError) throw error;
      throw new OrderExecutionError(error instanceof Error ? error.message : 'Execution failed');
    }
  }

  // ... existing handleExecutionReport and other methods ...
}
