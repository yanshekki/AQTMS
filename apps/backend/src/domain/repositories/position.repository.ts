import { Position } from '../entities/position.entity';

export interface IPositionRepository {
  findById(id: string): Promise<Position | null>;
  findByUserIdAndSymbol(userId: string, symbol: string): Promise<Position | null>;
  findByExchangeAccountId(exchangeAccountId: string): Promise<Position[]>;
  save(position: Position): Promise<Position>;
  update(position: Position): Promise<Position>;
}
