import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Direct (non-pooled) connection — required by Prisma Migrate.
    // PgBouncer (POSTGRES_PRISMA_URL) doesn't support DDL statements.
    // Use process.env directly (not env()) so `prisma generate` in CI
    // doesn't throw when no DB URL is available.
    url: process.env.POSTGRES_URL_NON_POOLING ?? "",
  },
});
