import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ISignalRepository } from '../../domain/repositories/signal.repository.interface';
import { Signal } from '../../domain/entities/signal.entity';

@Injectable()
export class PrismaSignalRepository implements ISignalRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(prismaSignal: any): Signal {
    return new Signal(
      prismaSignal.id,
      prismaSignal.source,
      prismaSignal.symbol,
      prismaSignal.action as 'BUY' | 'SELL' | 'HOLD',
      prismaSignal.score,
      prismaSignal.confidence ?? 0,
      prismaSignal.timestamp,
      prismaSignal.metadata,
    );
  }

  async findById(id: string): Promise<Signal | null> {
    const s = await this.prisma.signal.findUnique({ where: { id } });
    return s ? this.mapToEntity(s) : null;
  }

  async findByUserId(userId: string): Promise<Signal[]> {
    const prismaSignals = await this.prisma.signal.findMany({
      where: { id: userId } as any,
      take: 50,
      orderBy: { timestamp: 'desc' },
    });
    return prismaSignals.map((s) => this.mapToEntity(s));
  }

  async findBySymbol(symbol: string, limit = 50): Promise<Signal[]> {
    const prismaSignals = await this.prisma.signal.findMany({
      where: { symbol },
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
    return prismaSignals.map((s) => this.mapToEntity(s));
  }

  async save(signal: Signal): Promise<Signal> {
    const data = {
      source: signal.source,
      symbol: signal.symbol,
      action: signal.action,
      score: signal.score,
      confidence: signal.confidence,
      metadata: signal.metadata ?? null,
      timestamp: signal.timestamp,
    };

    const created = await this.prisma.signal.create({
      data,
    });
    return this.mapToEntity(created);
  }

  async findRecent(limit = 50): Promise<Signal[]> {
    const prismaSignals = await this.prisma.signal.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
    return prismaSignals.map((s) => this.mapToEntity(s));
  }
}