// ── Prisma Trade Repository ──
// Implements ITradeRepository from domain layer using Prisma.

import { PrismaClient, Prisma } from '@prisma/client';
import type { Trade, ITradeRepository, TradeStatus } from '../../domain/entities/Trade';

const prisma = new PrismaClient();

export class PrismaTradeRepository implements ITradeRepository {
  async save(trade: Trade, userId?: string): Promise<Trade> {
    const actualUserId = userId ?? trade.exchangeAccountId ?? 'system';
    const data: Prisma.TradeCreateInput = {
      id: trade.id,
      exchangeOrderId: trade.exchangeOrderId,
      symbol: trade.symbol,
      side: trade.side,
      type: trade.type,
      status: trade.status,
      quantity: trade.quantity,
      price: trade.price,
      stopPrice: trade.stopPrice,
      timeInForce: trade.timeInForce,
      filledQuantity: trade.filledQuantity,
      idempotencyKey: trade.idempotencyKey,
      user: { connect: { id: actualUserId } },
      exchangeAccount: { connect: { id: trade.exchangeAccountId } },
    };

    try {
      const saved = await prisma.trade.create({ data });
      return this.mapToDomain(saved);
    } catch (err) {
      // Fallback: if userId doesn't exist, try with first admin user
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        const fallbackUser = await prisma.user.findFirst({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
        if (fallbackUser) {
          data.user = { connect: { id: fallbackUser.id } };
          const saved = await prisma.trade.create({ data });
          return this.mapToDomain(saved);
        }
      }
      throw err;
    }
  }

  async findById(id: string): Promise<Trade | null> {
    const row = await prisma.trade.findUnique({ where: { id } });
    return row ? this.mapToDomain(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Trade | null> {
    const row = await prisma.trade.findUnique({ where: { idempotencyKey: key } });
    return row ? this.mapToDomain(row) : null;
  }

  async updateStatus(id: string, status: TradeStatus, filledQuantity?: number): Promise<Trade> {
    const updated = await prisma.trade.update({
      where: { id },
      data: {
        status,
        ...(filledQuantity !== undefined ? { filledQuantity } : {}),
      },
    });
    return this.mapToDomain(updated);
  }

  async findByUser(userId: string, limit = 20, offset = 0): Promise<Trade[]> {
    const rows = await prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(row: Prisma.TradeGetPayload<object>): Trade {
    return {
      id: row.id,
      exchangeOrderId: row.exchangeOrderId,
      exchangeAccountId: row.exchangeAccountId,
      symbol: row.symbol,
      side: row.side as Trade['side'],
      type: row.type as Trade['type'],
      quantity: row.quantity,
      price: row.price,
      stopPrice: row.stopPrice,
      timeInForce: row.timeInForce as Trade['timeInForce'],
      status: row.status as TradeStatus,
      filledQuantity: row.filledQuantity,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
