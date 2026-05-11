import { Injectable } from '@nestjs/common';
import { ISignalRepository } from '../../domain/repositories/signal.repository.interface';
import { Signal } from '../../domain/entities/signal.entity';

@Injectable()
export class InMemorySignalRepository implements ISignalRepository {
  private signals: Signal[] = [];

  async findById(id: string): Promise<Signal | null> {
    return this.signals.find(s => s.id === id) || null;
  }

  async findByUserId(userId: string): Promise<Signal[]> {
    return this.signals.filter(s => (s as any).userId === userId);
  }

  async findBySymbol(symbol: string, limit = 50): Promise<Signal[]> {
    return this.signals
      .filter(s => s.symbol === symbol)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async save(signal: Signal): Promise<Signal> {
    this.signals.push(signal);
    if (this.signals.length > 1000) {
      this.signals = this.signals.slice(-1000);
    }
    return signal;
  }

  async findRecent(limit = 50): Promise<Signal[]> {
    return [...this.signals]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}