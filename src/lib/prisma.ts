import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildConnectionConfig() {
  const rawUrl = process.env.POSTGRES_PRISMA_URL ?? "";

  // pg v8 treats sslmode=require as an alias for verify-full (strict cert validation),
  // which fails against Supabase's certificate chain. Strip sslmode from the URL so
  // our explicit ssl config is the sole authority on TLS behavior.
  // See: https://github.com/brianc/node-postgres/issues/3289
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete("sslmode");
    return {
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    // Fallback if URL parsing fails (shouldn't happen with a valid connection string)
    return {
      connectionString: rawUrl,
      ssl: { rejectUnauthorized: false },
    };
  }
}

function createPrismaClient() {
  return new PrismaClient({ adapter: new PrismaPg(buildConnectionConfig()) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
