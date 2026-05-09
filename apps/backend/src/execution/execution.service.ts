import { Injectable, OnModuleInit } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { PlaceOrderWithProtectionDto } from './dto/place-order-with-protection.dto';
import { retry } from '../common/utils/retry.util';
import { CircuitBreaker } from '../common/circuit-breaker/circuit-breaker';
import { RiskCheckFailedError } from '../common/errors/risk.error';
import { OrderExecutionError } from '../common/errors/order.error';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { KillSwitchService } from '../safety/kill-switch.service';
import { OrderService } from '../order/order.service';
import { ExecutionLoggerService } from './execution-logger.service';
import { ExecutionMetricsCollector } from './metrics-collector.service';

@Injectable()
export class ExecutionService implements OnModuleInit {
  // ... existing code ...

  /**
   * 處理交易所發來的成交更新（包含部分成交）
   */
  async handleOrderFillUpdate(
    orderId: string,
    fillQuantity: number,
    fillPrice: number,
  ) {
    try {
      const updatedOrder = this.orderService.applyPartialFill(
        orderId,
        fillQuantity,
        fillPrice,
      );

      this.logger.logStatusUpdate({
        orderId,
        fromStatus: 'PREVIOUS',
        toStatus: updatedOrder.status,
        filledQuantity: updatedOrder.filledQuantity,
      });

      // TODO: 如果需要，可在此更新本地倉位與風險狀態

      return updatedOrder;
    } catch (error) {
      this.logger.logError({
        action: 'PARTIAL_FILL_UPDATE_FAILED',
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ... existing methods ...
}
