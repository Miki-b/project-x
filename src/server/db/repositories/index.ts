/**
 * Thin, org-scoped query helpers (docs/architecture.md §3).
 *
 * A repository receives an already-scoped client from `orgDb(ctx.orgId)` and
 * encapsulates a specific query shape. Repositories hold NO business logic — that
 * lives in src/server/services. No repository constructs its own Prisma client.
 *
 * Example shape (implement during feature work):
 *   export function findOpenTasksForAssignee(db: OrgDb, assigneeId: string) { ... }
 */

export {};
