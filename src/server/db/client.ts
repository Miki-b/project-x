import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * The ONE place a Prisma client is constructed (docs/architecture.md §3, §5).
 *
 * Prisma 7 has no Rust engine: the client runs through a driver adapter. We use
 * @prisma/adapter-pg against the POOLED `DATABASE_URL` — both `web` and `worker` are
 * long-lived processes on a VPS (§13) and need interactive transactions (§7 status
 * changes, §8 job claim), which the Neon HTTP driver does not support. Migrations use the
 * unpooled `DIRECT_URL` via prisma.config.ts instead.
 *
 * `basePrisma` performs NO tenant scoping. Feature code must NEVER import it.
 * Instead call `orgDb(ctx.orgId)`, which returns a scoped client that injects
 * `orgId` automatically, so forgetting to scope a query becomes a deliberate act.
 *
 * `basePrisma` is exported only for trusted, cross-org infrastructure:
 *   - the job runner poll/claim query (src/server/jobs/runner.ts)
 *   - migrations and the seed script
 * `$queryRaw` bypasses the extension entirely — any raw SQL must add the org filter
 * by hand (docs/architecture.md §5 rule 3).
 */

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForPrisma = globalThis as unknown as { basePrisma?: PrismaClient };

export const basePrisma: PrismaClient = globalForPrisma.basePrisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.basePrisma = basePrisma;
}

/**
 * Mutates a Prisma operation's `args` in place, injecting `orgId` per operation
 * (docs/architecture.md §5 rule 2):
 *   - read / update / delete  -> into `where`
 *   - create / createMany     -> into `data`
 *   - upsert                  -> into both `where` and `create`
 *
 * `findUnique`/`findUniqueOrThrow`/`update`/`delete` accept the extra `orgId` filter
 * alongside the unique field (Prisma's extendedWhereUnique, GA since Prisma 5): a
 * cross-org lookup by id returns null / P2025. Verified permanently by
 * src/server/db/orgScope.integration.ts.
 */
function applyOrgScope(operation: string, args: Record<string, unknown>, orgId: string): void {
  switch (operation) {
    case "findUnique":
    case "findUniqueOrThrow":
    case "findFirst":
    case "findFirstOrThrow":
    case "findMany":
    case "count":
    case "aggregate":
    case "groupBy":
    case "update":
    case "updateMany":
    case "delete":
    case "deleteMany":
      args.where = { ...(args.where as Record<string, unknown> | undefined), orgId };
      break;
    case "create":
      args.data = { ...(args.data as Record<string, unknown> | undefined), orgId };
      break;
    case "createMany": {
      const data = args.data;
      args.data = Array.isArray(data)
        ? data.map((row) => ({ ...(row as Record<string, unknown>), orgId }))
        : { ...(data as Record<string, unknown> | undefined), orgId };
      break;
    }
    case "upsert":
      args.where = { ...(args.where as Record<string, unknown> | undefined), orgId };
      args.create = { ...(args.create as Record<string, unknown> | undefined), orgId };
      break;
    default:
      break;
  }
}

/**
 * Returns a Prisma client extension scoped to a single tenant. Every query it runs
 * carries `orgId`. `Organization` is the tenant root (it has no `orgId` column) and
 * is never scoped.
 */
export function orgDb(orgId: string) {
  return basePrisma.$extends({
    name: "org-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model !== "Organization") {
            applyOrgScope(operation, args as Record<string, unknown>, orgId);
          }
          return query(args);
        },
      },
    },
  });
}

/** A tenant-scoped Prisma client, as returned by `orgDb`. */
export type OrgDb = ReturnType<typeof orgDb>;
