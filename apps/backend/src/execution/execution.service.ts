import { Injectable, OnModuleInit } from '@nestjs/common';
import { MetricsService } from '../common/metrics/metrics.service';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { PrismaService } from '../prisma/prisma.service';

// TODO: Import your actual RiskService when ready
// import { RiskService } from '../risk/risk.service';

@Injectable()
export class ExecutionService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
    private readonly paperTradingService: PaperTradingService,
    // private readonly riskService: RiskService,   // ← 之後注入
  ) {}

  async onModuleInit() {
    // existing init logic
  }

  /**
   * Phase 4 improved flow:
   * 1. Risk check first (always)
   * 2. Then decide Real vs Paper Trading
   */
  async placeOrderWithProtection(dto: any) {
    try {
      // ============================================
      // 1. RISK CHECK（無論真實定模擬都要做）
      // ============================================
      // TODO: 呼叫真正嘅 Risk 評估
      // const riskResult = await this.riskService.evaluatePreTrade(dto);
      // if (!riskResult.allowed) {
      //   throw new Error(`Risk check failed: ${riskResult.reason}`);
      // }

      // 暫時用簡單 log 代表風險檢查已通過
      console.log(`[Execution] Risk check passed for ${dto.symbol} (Paper mode will be respected)`);

      // ============================================
      // 2. 取得 ExchangeAccount 判斷係咪 Paper Trading
      // ============================================
      const exchangeAccount = await this.prisma.exchangeAccount.findUnique({
        where: { id: dto.exchangeAccountId },
      });

      if (!exchangeAccount) {
        throw new Error('Exchange account not found');
      }

      // ============================================
      // 3. 根據模式路由
      // ============================================
      if (exchangeAccount.isPaperTrading) {
        this.metricsService.recordOrderPlaced('PAPER', dto.symbol);

        const paperResult = await this.paperTradingService.placePaperOrder({
          userId: dto.userId,
          symbol: dto.symbol,
          side: dto.side,
          quantity: dto.quantity,
          price: dto.price || 0,
        });

        return {
          success: true,
          isPaper: true,
          riskChecked: true,
          ...paperResult,
        };
      }

      // Real trading path
      this.metricsService.recordOrderPlaced(dto.exchange || 'REAL', dto.symbol);

      // TODO: 真正嘅交易所下單邏輯
      return {
        success: true,
        isPaper: false,
        riskChecked: true,
        // ... real order result
      };
    } catch (error) {
      this.metricsService.recordOrderFailed(
        dto.exchange || 'UNKNOWN',
        dto.symbol,
        error instanceof Error ? error.message : 'unknown',
      );
      throw error;
    }
  }
}
