import { Injectable } from '@nestjs/common';
import { IPositionRepository } from '../../domain/repositories/position.repository.interface';
import { Position } from '../../domain/entities/position.entity';

@Injectable()
export class InMemoryPositionRepository implements IPositionRepository {
  private positions: Map<string, Position[]> = new Map(); // key: userId or exchangeAccountId

  async findByUserId(userId: string): Promise<Position[]> {
    return this.positions.get(userId) || [];
  }

  async findByExchangeAccount(exchangeAccountId: string): Promise<Position[]> {
    const allPositions: Position[] = [];
    for (const posList of this.positions.values()) {
      allPositions.push(...posList.filter(p => (p as any).exchangeAccountId === exchangeAccountId));
    }
    return allPositions;
  }

  async save(position: Position): Promise<Position> {
    const userId = (position as any).userId || 'default';
    const existing = this.positions.get(userId) || [];
    const idx = existing.findIndex(p => p.symbol === position.symbol);
    if (idx >= 0) {
      existing[idx] = position;
    } else {
      existing.push(position);
    }
    this.positions.set(userId, existing);
    return position;
  }

  async delete(id: string): Promise<void> {
    for (const [userId, posList] of this.positions.entries()) {
      const filtered = posList.filter(p => p.id !== id);
      this.positions.set(userId, filtered);
    }
  }

  async deleteBySymbol(symbol: string, exchangeAccountId: string): Promise<void> {
    for (const [userId, posList] of this.positions.entries()) {
      const filtered = posList.filter(p => !(p.symbol === symbol && (p as any).exchangeAccountId === exchangeAccountId));
      this.positions.set(userId, filtered);
    }
  }

  async findByUserIdAndSymbol(userId: string, symbol: string): Promise<Position | null> {
    const posList = this.positions.get(userId) || [];
    return posList.find(p => p.symbol === symbol) || null;
  }

  async update(position: Position): Promise<Position> {
    await this.save(position);
    return position;
  }
}