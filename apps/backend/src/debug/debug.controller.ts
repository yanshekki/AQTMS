import { Controller, Get, Param, Logger } from '@nestjs/common';
import { PaperTradingService } from '../paper-trading/paper-trading.service';

/**
 * Debug Controller (Temporary - for development only)
 * 
 * Provides easy endpoints to test Paper Trading + real-time PnL.
 * Remove or protect this in production.
 */
@Controller('debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  constructor(private readonly paperTradingService: PaperTradingService) {}

  /**
   * Get Paper positions with live PnL for a user
   * Usage: GET /debug/paper-pnl/{userId}
   */
  @Get('paper-pnl/:userId')
  async getPaperPnL(@Param('userId') userId: string) {
    this.logger.log(`[Debug] Fetching Paper PnL for user: ${userId}`);

    try {
      const positions = await this.paperTradingService.getPaperPositionsWithLivePnL(userId);

      return {
        success: true,
        userId,
        timestamp: new Date().toISOString(),
        positions,
        totalUnrealizedPnl: positions.reduce((sum, p) => sum + p.unrealizedPnl, 0),
      };
    } catch (error) {
      this.logger.error('Failed to get Paper PnL', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Quick health check for MarketDataService prices
   */
  @Get('prices')
  async getCachedPrices() {
    // Note: In real implementation, expose getAllCachedPrices from MarketDataService
    return {
      success: true,
      message: 'Use this endpoint to verify if prices are flowing from WebSocket',
      note: 'Implement getAllCachedPrices() in MarketDataService if needed',
    };
  }
}
