import { Controller, Get, Query, Logger } from '@nestjs/common';
import { PaperTradingService } from './paper-trading.service';

@Controller('paper-trading')
export class PaperTradingController {
  private readonly logger = new Logger(PaperTradingController.name);

  constructor(private readonly paperTradingService: PaperTradingService) {}

  /**
   * Get paper trading positions with live unrealized PnL
   * Example: GET /paper-trading/positions?userId=xxx
   */
  @Get('positions')
  async getPositions(@Query('userId') userId: string) {
    if (!userId) {
      return { success: false, message: 'userId is required' };
    }

    this.logger.log(`Fetching paper positions for user: ${userId}`);

    try {
      const positions = await this.paperTradingService.getPaperPositionsWithLivePnL(userId);

      const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

      return {
        success: true,
        data: {
          positions,
          totalUnrealizedPnl: parseFloat(totalUnrealizedPnl.toFixed(2)),
          count: positions.length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get paper positions', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
