import { Position } from '../entities/position.entity';

export interface IPositionRepository {
  findByUserIdAndSymbol(userId: string, symbol: string): Promise<Position | null>;
  findByUserId(userId: string): Promise<Position[]>;
  save(position: Position): Promise<Position>;
  update(position: Position): Promise<Position>;
  delete(id: string): Promise<void>;
}
