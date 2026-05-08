// ── DataSource Manager ──
// 負責管理運行中的數據來源（啟動/停止 polling）

 import { logger } from '../../shared/logger';

 interface RunningDataSource {
   id: string;
   type: string;
   stop: () => void;
 }

 export class DataSourceManager {
   private runningSources = new Map<string, RunningDataSource>();

   startPolling(dataSourceId: string, type: string, stopFn: () => void) {
     if (this.runningSources.has(dataSourceId)) {
       logger.warn(`DataSource ${dataSourceId} is already running`);
       return;
     }

     this.runningSources.set(dataSourceId, {
       id: dataSourceId,
       type,
       stop: stopFn,
     });

     logger.info(`📡 Started polling for DataSource: ${dataSourceId} (${type})`);
   }

   stopPolling(dataSourceId: string) {
     const source = this.runningSources.get(dataSourceId);
     if (source) {
       source.stop();
       this.runningSources.delete(dataSourceId);
       logger.info(`🛑 Stopped polling for DataSource: ${dataSourceId}`);
     }
   }

   stopAll() {
     for (const [id, source] of this.runningSources) {
       source.stop();
       logger.info(`🛑 Stopped polling for DataSource: ${id}`);
     }
     this.runningSources.clear();
   }

   getRunningCount(): number {
     return this.runningSources.size;
   }
 }

 // Singleton
 export const dataSourceManager = new DataSourceManager();
