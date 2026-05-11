import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { EncryptionService } from '../infrastructure/shared/encryption.service';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';
import { withRetry } from '../common/utils/retry.util';
import { CircuitBreaker } from '../common/utils/circuit-breaker';

export interface OrderExecutionResult {
  success: boolean;
  orderId?: string;
  executionPrice?: number;
  message: string;
  riskResult?: any;
  paperResult?: any;
  liveResult?: any;
}

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  // Circuit breaker for live exchange calls (per instance)
  private readonly liveTradingBreaker = new CircuitBreaker({
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeoutMs: 60000, // 1 minute
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService,
    @Optional() private readonly paperTradingService?: PaperTradingService,
    @Optional() private readonly encryptionService?: EncryptionService,
    @Optional() private readonly ccxtAdapter?: CcxtExchangeAdapter,
  ) {}

  async executeOrder(orderData: any): Promise<OrderExecutionResult> {
    this.logger.log(`Executing order for symbol: ${orderData.symbol}, side: ${orderData.side}`);

    const riskResult = await this.riskService.evaluateRisk(orderData);

    if (!riskResult.passed) {
      this.logger.warn(`Risk check failed: ${riskResult.reasons.join(', ')}`);
      throw new BadRequestException({
        message: 'Order rejected due to risk rules',
        reasons: riskResult.reasons,
      });
    }

    const isPaper = orderData.isPaper !== false;

    // Kill Switch Check
    if (!isPaper) {
      const isKillSwitchActive = await this.checkKillSwitch(orderData.userId);
      if (isKillSwitchActive) {
        throw new BadRequestException({
          message: 'Kill Switch is active. Live trading is disabled.',
          reason: 'KILL_SWITCH_ACTIVE',
        });
      }
    }

    // Paper Trading Path
    if (isPaper && this.paperTradingService) {
      // ... (paper trading logic remains the same)
      const simulatedPrice = orderData.price || 50000;
      const orderId = orderData.orderId || `paper-${Date.now()}`;

      try {
        const paperResult = await this.paperTradingService.processPaperFill({
          exchangeAccountId: orderData.exchangeAccountId || 'demo-paper-account',
          userId: orderData.userId || 'demo-user',
          symbol: orderData.symbol,
          side: orderData.side?.toUpperCase() || 'BUY',
          quantity: orderData.quantity || 0.001,
          fillPrice: simulatedPrice,
          orderId,
        });

        await this.prisma.executionLog.create({
          data: {
            userId: orderData.userId || 'demo-user',
            orderId,
            action: 'PLACE_PAPER_ORDER',
            details: { ...orderData, riskResult, paperResult, simulatedPrice },
          },
        }).catch((e) => this.logger.warn('Log failed', e.message));

        return {
          success: true,
          orderId,
          executionPrice: simulatedPrice,
          message: 'Paper order executed with real virtual balance & PnL tracking',
          riskResult,
          paperResult,
        };
      } catch (err: any) {
        this.logger.error('PaperTrading integration failed', err);
      }
    }

    // Real Live Trading Path with Circuit Breaker + Retry
    if (!isPaper) {
      this.logger.log('=== LIVE TRADING MODE (with Circuit Breaker + Retry) ===');

      if (!this.ccxtAdapter || !this.encryptionService) {
        return {
          success: false,
          message: 'Real trading not configured.',
          riskResult,
        };
      }

      try {
        const exchangeAccount = await this.prisma.exchangeAccount.findUnique({
          where: { id: orderData.exchangeAccountId },
        });

        if (!exchangeAccount || !exchangeAccount.apiKeyEncrypted) {
          throw new Error('Exchange account or encrypted API key not found');
        }

        const apiKey = this.encryptionService.decrypt(exchangeAccount.apiKeyEncrypted);
        const apiSecret = exchangeAccount.apiSecretEncrypted
          ? this.encryptionService.decrypt(exchangeAccount.apiSecretEncrypted)
          : undefined;

        // Initialize adapter
        await this.ccxtAdapter.initialize({
          exchange: exchangeAccount.exchange as any,
          apiKey,
          apiSecret,
          testnet: exchangeAccount.testnet || false,
        });

        // Wrap live order placement with Circuit Breaker + Retry
        const liveResult = await this.liveTradingBreaker.execute(() =>
          withRetry(
            () =>
              this.ccxtAdapter!.placeOrder({
                symbol: orderData.symbol,
                side: orderData.side?.toUpperCase(),
                type: orderData.type || 'MARKET',
                quantity: orderData.quantity,
                price: orderData.price,
                stopLoss: orderData.stopLoss,
                takeProfit: orderData.takeProfit,
              }),
            {
              maxAttempts: 3,
              initialDelayMs: 800,
              shouldRetry: (err) => {
                const msg = err?.message?.toLowerCase() || '';
                return msg.includes('timeout') || msg.includes('network') || msg.includes('rate');
              },
            },
          ),
        );

        const orderId = liveResult?.id || `live-${Date.now()}`;

        await this.prisma.executionLog.create({
          data: {
            userId: orderData.userId || 'demo-user',
            orderId,
            action: 'PLACE_LIVE_ORDER',
            details: { ...orderData, riskResult, liveResult },
          },
        }).catch((e) => this.logger.warn('Log failed', e.message));

        this.logger.log(`LIVE order placed successfully with protection: ${orderId}`);

        return {
          success: true,
          orderId,
          executionPrice: liveResult?.price || orderData.price,
          message: 'Live order executed on exchange (protected by Circuit Breaker + Retry)',
          riskResult,
          liveResult,
        };
      } catch (err: any) {
        this.logger.error('Live trading execution failed (after Circuit Breaker/Retry)', err);

        if (err.message?.includes('Circuit breaker is OPEN')) {
          throw new BadRequestException({
            message: 'Exchange temporarily unavailable due to repeated failures. Please try again later.',
            reason: 'CIRCUIT_BREAKER_OPEN',
          });
        }

        throw new BadRequestException({
          message: 'Live order execution failed',
          error: err.message,
        });
      }
    }

    return {
      success: false,
      message: 'No execution path available',
      riskResult,
    };
  }

  private async checkKillSwitch(userId: string): Promise<boolean> {
    try {
      const safety = await this.prisma.safetySetting?.findFirst?.({ where: { userId } });
      return safety?.killSwitchActive === true;
    } catch {
      return false;
    }
  }

  async cancelOrder(orderId: string, userId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Cancelling order: ${orderId}`);
    return {
      success: true,
      message: `Order ${orderId} cancelled (demo)`,
    };
  }
}
