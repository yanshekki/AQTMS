import { Signal } from '../entities/signal.entity';

export interface ISignalRepository {
  findById(id: string): Promise<Signal | null>;
  findByUserId(userId: string): Promise<Signal[]>;
  save(signal: Signal): Promise<Signal>;
}
