import { Injectable } from '@nestjs/common';

// import { PrismaService } from '../shared/prisma.service';

/**
 * 建議 Prisma Model:
 *
 * model DailyPnL {
 *   id     String   @id @default(uuid())
 *   userId String
 *   date   String   // YYYY-MM-DD
 *   pnl    Float
 *
 *   @@unique([userId, date])
 *   @@index([userId])
 * }
 */

@Injectable()
export class DailyPnLService {
  // constructor(private readonly prisma: PrismaService) {}

  async updateDailyPnL(userId: string, pnl: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // await this.prisma.dailyPnL.upsert({
    //   where: { userId_date: { userId, date: today } },
    //   update: { pnl },
    //   create: { userId, date: today, pnl },
    // });

    // TODO: persist PnL to DB when model is ready
  }

  async getTodayPnL(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    // const record = await this.prisma.dailyPnL.findUnique({
    //   where: { userId_date: { userId, date: today } },
    // });
    // return record?.pnl || 0;

    return 0;
  }

  async resetTodayPnL(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    // await this.prisma.dailyPnL.updateMany({
    //   where: { userId, date: today },
    //   data: { pnl: 0 },
    // });
    // TODO: persist reset to DB when model is ready
  }
}
