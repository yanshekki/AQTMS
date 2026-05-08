// ── Prisma DataSource Repository Implementation ──

import { PrismaClient } from '@prisma/client';
import { DataSource, type DataSourceType, type DataSourceStatus } from '../../domain/entities/DataSource';
import type { DataSourceRepository } from '../../domain/repositories/DataSourceRepository';

interface PrismaDataSource {
  id: string;
  userId: string;
  type: string;
  name: string;
  config: string;
  status: string;
  lastError: string | null;
  lastFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaDataSourceRepository implements DataSourceRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<DataSource | null> {
    const record = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByUserId(userId: string): Promise<DataSource[]> {
    const records = await this.prisma.dataSource.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByUserAndType(userId: string, type: DataSourceType): Promise<DataSource[]> {
    const records = await this.prisma.dataSource.findMany({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(dataSource: DataSource): Promise<DataSource> {
    const primitives = dataSource.toPrimitives();

    const record = await this.prisma.dataSource.create({
      data: {
        id: primitives.id,
        userId: primitives.userId,
        type: primitives.type,
        name: primitives.name,
        config: JSON.stringify(primitives.config),
        status: primitives.status,
        lastError: primitives.lastError ?? null,
        lastFetchedAt: primitives.lastFetchedAt ?? null,
      },
    });

    return this.toDomain(record);
  }

  async update(dataSource: DataSource): Promise<DataSource> {
    const primitives = dataSource.toPrimitives();

    const record = await this.prisma.dataSource.update({
      where: { id: primitives.id },
      data: {
        name: primitives.name,
        config: JSON.stringify(primitives.config),
        status: primitives.status,
        lastError: primitives.lastError ?? null,
        lastFetchedAt: primitives.lastFetchedAt ?? null,
      },
    });

    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.dataSource.delete({ where: { id } });
  }

  async exists(userId: string, type: DataSourceType, name: string): Promise<boolean> {
    const count = await this.prisma.dataSource.count({
      where: { userId, type, name },
    });
    return count > 0;
  }

  private toDomain(record: PrismaDataSource): DataSource {
    return new DataSource({
      id: record.id,
      userId: record.userId,
      type: record.type as DataSourceType,
      name: record.name,
      config: JSON.parse(record.config) as Record<string, unknown>,
      status: record.status as DataSourceStatus,
      lastError: record.lastError ?? undefined,
      lastFetchedAt: record.lastFetchedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
