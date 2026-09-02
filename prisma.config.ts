import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 configuration (docs/architecture.md §6). Replaces the old package.json
 * `prisma` key. When this file is present Prisma no longer auto-loads `.env`, so we load
 * it explicitly above.
 *
 * The CLI (migrate/db push/studio) connects using `datasource.url`. That must be the
 * UNPOOLED `DIRECT_URL` — Prisma cannot migrate through Neon's pooler. The application
 * runtime connects separately through @prisma/adapter-pg against the pooled `DATABASE_URL`
 * (see src/server/db/client.ts). Prisma 7 dropped `datasource.directUrl`, so the split is
 * expressed here (CLI = DIRECT_URL) vs. in the adapter (app = DATABASE_URL).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
