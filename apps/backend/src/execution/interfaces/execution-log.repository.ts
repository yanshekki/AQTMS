import { ExecutionLog, LogQuery } from '../execution-logger.service';

export interface IExecutionLogRepository {
  save(log: ExecutionLog): Promise<void> | void;
  find(query: LogQuery): Promise<ExecutionLog[]> | ExecutionLog[];
  clear(): Promise<void> | void;
  count?(): Promise<number> | number;
}
