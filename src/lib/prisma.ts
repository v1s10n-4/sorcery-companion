import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL || process.env.DIRECT_URL;
  // Supabase's connection pooler uses certificates that don't chain to a
  // public CA, so rejectUnauthorized must be false for production.
  // Set DATABASE_SSL=false for local development without TLS.
  const ssl =
    process.env.DATABASE_SSL === "false"
      ? false
      : { rejectUnauthorized: false };
  const pool = new pg.Pool({
    connectionString,
    ...(ssl ? { ssl } : {}),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
