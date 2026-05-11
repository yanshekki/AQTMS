import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IPositionRepository } from '../../domain/repositories/position.repository.interface';
import { Position } from '../../domain/entities/position.entity';

@Injectable()
export class PrismaPositionRepository implements IPositionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(prismaPosition: any): Position {
    return new Position({
      id: prismaPosition.id,
      userId: prismaPosition.userId,
      exchangeAccountId: prismaPosition.exchangeAccountId,
      symbol: prismaPosition.symbol,
      quantity: prismaPosition.quantity,
      avgPrice: prismaPosition.avgPrice,
      unrealizedPnl: prismaPosition.unrealizedPnl,
      realizedPnl: prismaPosition.realizedPnl,
      createdAt: prismaPosition.createdAt,
      updatedAt: prismaPosition.updatedAt,
    });
  }

  async findByUserId(userId: string): Promise<Position[]> {
    const prismaPositions = await this.prisma.position.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return prismaPositions.map((p) => this.mapToEntity(p));
  }

  async findByExchangeAccount(exchangeAccountId: string): Promise<Position[]> {
    const prismaPositions = await this.prisma.position.findMany({
      where: { exchangeAccountId },
      orderBy: { updatedAt: 'desc' },
    });
    return prismaPositions.map((p) => this.mapToEntity(p));
  }

  async save(position: Position): Promise<Position> {
    const data = {
      userId: position.userId,
      exchangeAccountId: position.exchangeAccountId,
      symbol: position.symbol,
      quantity: position.quantity,
      avgPrice: position.avgPrice,
      unrealizedPnl: position.unrealizedPnl,
      realizedPnl: position.realizedPnl,
      updatedAt: new Date(),
    };

    const existing = await this.prisma.position.findUnique({
      where: {
        exchangeAccountId_symbol: {
          exchangeAccountId: position.exchangeAccountId,
          symbol: position.symbol,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.position.update({
        where: { id: existing.id },
        data: {
          quantity: position.quantity,
          avgPrice: position.avgPrice,
          unrealizedPnl: position.unrealizedPnl,
          realizedPnl: position.realizedPnl,
          updatedAt: new Date(),
        },
      });
      return this.mapToEntity(updated);
    } else {
      const created = await this.prisma.position.create({
        data: {
          ...data,
          id: position.id || undefined,
        },
      });
      return this.mapToEntity(created);
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.position.delete({ where: { id } });
  }

  async deleteBySymbol(symbol: string, exchangeAccountId: string): Promise<void> {
    await this.prisma.position.deleteMany({
      where: { symbol, exchangeAccountId },
    });
  }

  async findByUserIdAndSymbol(userId: string, symbol: string): Promise<Position | null> {
    const p = await this.prisma.position.findFirst({
      where: { userId, symbol },
    });
    return p ? this.mapToEntity(p) : null;
  }

  async update(position: Position): Promise<Position> {
    const updated = await this.prisma.position.update({
      where: { id: position.id },
      data: {
        quantity: position.quantity,
        avgPrice: position.avgPrice,
        unrealizedPnl: position.unrealizedPnl,
        realizedPnl: position.realizedPnl,
        updatedAt: new Date(),
      },
    });
    return this.mapToEntity(updated);
  }
}