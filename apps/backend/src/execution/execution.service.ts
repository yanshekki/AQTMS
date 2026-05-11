import { Injectable, Logger, BadRequestException, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { EncryptionService } from '../infrastructure/shared/encryption.service';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService,
    @Optional() private readonly paperTradingService?: PaperTradingService,
    @Optional() private readonly encryptionService?: EncryptionService,
    @Optional() private readonly ccxtAdapter?: CcxtExchangeAdapter,
  ) {}

  async executeOrder(orderData: any): Promise<OrderExecutionResult> {
    this.logger.log(`Executing order for symbol: ${orderData.symbol}, side: ${orderData.side}`);

    // 1. Risk Evaluation
    const riskResult = await this.riskService.evaluateRisk(orderData);

    if (!riskResult.passed) {
      this.logger.warn(`Risk check failed: ${riskResult.reasons.join(', ')}`);
      throw new BadRequestException({
        message: 'Order rejected due to risk rules',
        reasons: riskResult.reasons,
      });
    }

    const isPaper = orderData.isPaper !== false;

    // 2. Kill Switch Check (for live trading)
    if (!isPaper) {
      const isKillSwitchActive = await this.checkKillSwitch(orderData.userId);
      if (isKillSwitchActive) {
        throw new BadRequestException({
          message: 'Kill Switch is active. Live trading is disabled.',
          reason: 'KILL_SWITCH_ACTIVE',
        });
      }
    }

    // 3. Paper Trading Path (fully integrated)
    if (isPaper && this.paperTradingService) {
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

        this.logger.log(`Paper order fully processed: ${orderId}`);

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

    // 4. Real Live Trading Path (Phase A)
    if (!isPaper) {
      this.logger.log('=== LIVE TRADING MODE ===');

      if (!this.ccxtAdapter || !this.encryptionService) {
        this.logger.error('Real trading dependencies missing (ccxtAdapter or EncryptionService)');
        return {
          success: false,
          message: 'Real trading not configured. Missing ccxt adapter or encryption service.',
          riskResult,
        };
      }

      try {
        // Get ExchangeAccount and decrypt API keys
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

        // Initialize ccxt with real credentials
        await this.ccxtAdapter.initialize({
          exchange: exchangeAccount.exchange as any,
          apiKey,
          apiSecret,
          testnet: exchangeAccount.testnet || false,
        });

        // Place real order
        const liveResult = await this.ccxtAdapter.placeOrder({
          symbol: orderData.symbol,
          side: orderData.side?.toUpperCase(),
          type: orderData.type || 'MARKET',
          quantity: orderData.quantity,
          price: orderData.price,
          stopLoss: orderData.stopLoss,
          takeProfit: orderData.takeProfit,
        });

        const orderId = liveResult?.id || `live-${Date.now()}`;

        await this.prisma.executionLog.create({
          data: {
            userId: orderData.userId || 'demo-user',
            orderId,
            action: 'PLACE_LIVE_ORDER',
            details: { ...orderData, riskResult, liveResult },
          },
        }).catch((e) => this.logger.warn('Log failed', e.message));

        this.logger.log(`LIVE order placed successfully: ${orderId}`);

        return {
          success: true,
          orderId,
          executionPrice: liveResult?.price || orderData.price,
          message: 'Live order executed on exchange',
          riskResult,
          liveResult,
        };
      } catch (err: any) {
        this.logger.error('Live trading execution failed', err);
        throw new BadRequestException({
          message: 'Live order execution failed',
          error: err.message,
        });
      }
    }

    // Fallback
    return {
      success: false,
      message: 'No execution path available',
      riskResult,
    };
  }

  private async checkKillSwitch(userId: string): Promise<boolean> {
    try {
      const safety = await this.prisma.safetySetting?.findFirst?.({
        where: { userId },
      });
      return safety?.killSwitchActive === true;
    } catch {
      return false; // fail open for now
    }
  }

  async cancelOrder(orderId: string, userId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Cancelling order: ${orderId}`);
    // TODO: Implement real cancel via ccxt if live
    return {
      success: true,
      message: `Order ${orderId} cancelled (demo)`,
    };
  }
}
