// ── Shared Prisma Client Singleton ──
// Prevents connection pool explosion in multi-instance PM2 deployments.
// All modules MUST import from here — never use `new PrismaClient()` directly.

import { PrismaClient } from '@prisma/client';

// Connection pool sizing for multi-instance:
// - Single PM2 instance: default pool (num_cores × 2)
// - With N PM2 instances: total connections = N × pool_size
// - Recommended: cap connection_limit in DATABASE_URL
//   e.g. DATABASE_URL="mysql://...?connection_limit=5"
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
