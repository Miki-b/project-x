import type { JobType, Prisma } from "@/generated/prisma/client";
import type { Ctx } from "@/types";

/**
 * Enqueue a job (docs/architecture.md §7, §8). Every outbound side effect goes through
 * the `jobs` table — never sent inline. Callers enqueue inside the same transaction as
 * the state change that triggered it. `dedupeKey` prevents duplicate sends on retry.
 */

export type EnqueueInput = {
  type: JobType;
  runAt: Date;
  payload?: Prisma.JsonObject;
  dedupeKey?: string;
  maxRetries?: number;
};

export async function enqueueJob(_ctx: Ctx, _input: EnqueueInput): Promise<void> {
  // Implementation: insert a jobs row via orgDb(ctx.orgId), honouring dedupeKey.
  throw new Error("not implemented");
}
