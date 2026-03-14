import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // POSTGRES_PRISMA_URL is the PgBouncer-pooled connection string provided by
  // the Supabase × Vercel integration. It's set in all Vercel environments and
  // should be populated via `vercel env pull .env.local` for local dev.
  const adapter = new PrismaPg({
    connectionString: process.env.POSTGRES_PRISMA_URL,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
