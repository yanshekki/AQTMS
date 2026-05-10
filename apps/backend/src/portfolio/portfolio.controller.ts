import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('summary')
  async getSummary(@Req() req: any) {
    const userId = req.user?.id;
    const summary = await this.portfolioService.getPortfolioSummary(userId);
    return {
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('positions')
  async getPositions(@Req() req: any) {
    const userId = req.user?.id;
    const positions = await this.portfolioService.getPositions(userId);
    return {
      success: true,
      data: positions,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('snapshots')
  async getSnapshots(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user?.id;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const snapshots = await this.portfolioService.getSnapshots(userId, limitNum);
    return {
      success: true,
      data: snapshots,
      timestamp: new Date().toISOString(),
    };
  }
}
