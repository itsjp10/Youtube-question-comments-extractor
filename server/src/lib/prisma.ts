import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/**
 * Single shared PrismaClient. A global cache keeps `tsx watch` from opening a
 * new pool on every hot reload during development.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
