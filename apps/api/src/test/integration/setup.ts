import { PrismaClient } from '@sanqin/database';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * 集成测试环境：强制指向 sanqin_bus_test 库（从 DATABASE_URL 改写 dbname），
 * 防止误连开发库。迁移未应用时在此显式报错。
 * （可用 ./scripts/test-db.sh migrate 应用迁移）
 */
export const TEST_DB_NAME = 'sanqin_bus_test';

export function resolveTestDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL || 'postgresql://root:x12345678@127.0.0.1:5432/sanqin_bus';
  const url = new URL(raw);
  url.pathname = `/${TEST_DB_NAME}`;
  return url.toString();
}

export async function createTestPrismaClient(): Promise<PrismaClient> {
  const connectionString = resolveTestDatabaseUrl();
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter } as any);
  await client.$connect();
  return client;
}

export async function destroyTestPrismaClient(client: PrismaClient): Promise<void> {
  await client.$disconnect();
}
