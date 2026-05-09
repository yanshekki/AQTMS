import { Injectable } from '@nestjs/common';

// import { PrismaService } from '../shared/prisma.service';

@Injectable()
export class DailyPnLService {
  // constructor(private readonly prisma: PrismaService) {}

  /**
   * 更新或建立當日 PnL
   */
  async updateDailyPnL(userId: string, pnl: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // TODO: 使用 upsert
    // await this.prisma.dailyPnL.upsert({
    //   where: { userId_date: { userId, date: today } },
    //   update: { pnl },
    //   create: { userId, date: today, pnl },
    // });

    console.log(`[DailyPnLService] Updated PnL for ${userId} on ${today}: ${pnl}`);
  }

  /**
   * 獲取當日 PnL
   */
  async getTodayPnL(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    // const record = await this.prisma.dailyPnL.findUnique({
    //   where: { userId_date: { userId, date: today } },
    // });
    // return record?.pnl || 0;

    return 0; // TODO
  }

  /**
   * 重置某用戶當日 PnL（手動用）
   */
  async resetTodayPnL(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    // await this.prisma.dailyPnL.updateMany({
    //   where: { userId, date: today },
    //   data: { pnl: 0 },
    // });
    console.log(`[DailyPnLService] Reset PnL for ${userId}`);
  }
}
