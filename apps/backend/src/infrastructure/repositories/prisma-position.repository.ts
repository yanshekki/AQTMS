import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IPositionRepository } from '../../domain/repositories/position.repository';
import { Position } from '../../domain/entities/position.entity';

@Injectable()
export class PrismaPositionRepository implements IPositionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Position | null> {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position) return null;
    return this.mapToEntity(position);
  }

  async findByUserIdAndSymbol(userId: string, symbol: string): Promise<Position | null> {
    const position = await this.prisma.position.findUnique({
      where: { exchangeAccountId_symbol: { exchangeAccountId: '', symbol } }, // Note: adjust if using userId directly
    });
    // For simplicity, using findFirst with userId and symbol
    const pos = await this.prisma.position.findFirst({
      where: { userId, symbol },
    });
    if (!pos) return null;
    return this.mapToEntity(pos);
  }

  async findByExchangeAccountId(exchangeAccountId: string): Promise<Position[]> {
    const positions = await this.prisma.position.findMany({ where: { exchangeAccountId } });
    return positions.map(this.mapToEntity);
  }

  async save(position: Position): Promise<Position> {
    const created = await this.prisma.position.create({
      data: this.mapToPrisma(position),
    });
    return this.mapToEntity(created);
  }

  async update(position: Position): Promise<Position> {
    const updated = await this.prisma.position.update({
      where: { id: position.id },
      data: this.mapToPrisma(position),
    });
    return this.mapToEntity(updated);
  }

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

  private mapToPrisma(position: Position): any {
    return {
      id: position.id || undefined,
      userId: position.userId,
      exchangeAccountId: position.exchangeAccountId,
      symbol: position.symbol,
      quantity: position.quantity,
      avgPrice: position.avgPrice,
      unrealizedPnl: position.unrealizedPnl,
      realizedPnl: position.realizedPnl,
    };
  }
}
