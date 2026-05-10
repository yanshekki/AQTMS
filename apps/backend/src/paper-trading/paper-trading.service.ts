import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PaperTradingService {
  private readonly logger = new Logger(PaperTradingService.name);

  async simulateFill(order: any) {
    this.logger.log('Simulating paper trade fill');
    return { ...order, status: 'FILLED', filledPrice: order.price || 100 };
  }
}