// ── DataSource API ──

import { z } from 'zod';
import { safeGet, safePost, safeDelete } from '@/shared/api';

// Schemas
const DataSourceSchema = z.object({
  id: z.string(),
  type: z.enum(['TELEGRAM', 'X', 'RSS', 'ONCHAIN']),
  name: z.string(),
  status: z.enum(['PENDING', 'CONNECTED', 'ERROR', 'DISABLED']),
  lastError: z.string().nullable().optional(),
  lastFetchedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const DataSourceListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(DataSourceSchema),
  timestamp: z.string(),
});

const ConnectDataSourceResponseSchema = z.object({
  success: z.literal(true),
  data: DataSourceSchema,
  timestamp: z.string(),
});

export const dataSourceApi = {
  async getDataSources() {
    const res = await safeGet('/api/v1/data-sources', DataSourceListResponseSchema);
    return res.data;
  },

  async connectDataSource(data: any) {
    const res = await safePost('/api/v1/data-sources', data, ConnectDataSourceResponseSchema);
    return res.data;
  },

  async deleteDataSource(id: string) {
    await safeDelete(`/api/v1/data-sources/${id}`);
  },
};
