import type { Job } from "@/generated/prisma/client";
// The runner is trusted cross-org INFRASTRUCTURE, not feature code, so it may import
// basePrisma directly (docs/architecture.md §5 rule 2 exempts infrastructure). It must
// never leak org data across tenants — the claim query operates on all orgs by design.
import { basePrisma, orgDb } from "@/server/db/client";
import { logger } from "@/lib/logger";
import { handlers } from "./handlers";

const POLL_INTERVAL_MS = 30_000; // poll every 30s (docs/architecture.md §8)
const CLAIM_BATCH = 20;
const STALE_LOCK_MS = 5 * 60_000; // reclaim RUNNING jobs locked longer than 5 minutes
const BASE_BACKOFF_MS = 30_000; // exponential backoff base on failure

let stopped = false;

/**
 * Claim up to CLAIM_BATCH due jobs atomically. `FOR UPDATE SKIP LOCKED` makes it safe
 * to run more than one worker without changing anything (docs/architecture.md §8, §14).
 * Raw SQL bypasses the orgDb extension; that is intentional here (§5 rule 3).
 */
async function claimJobs(): Promise<Job[]> {
  return basePrisma.$queryRaw<Job[]>`
    UPDATE "jobs"
    SET status = 'RUNNING', "lockedAt" = now()
    WHERE id IN (
      SELECT id FROM "jobs"
      WHERE status = 'PENDING' AND "runAt" <= now()
      ORDER BY "runAt" ASC
      LIMIT ${CLAIM_BATCH}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;
}

/** Return any RUNNING job whose lock is older than STALE_LOCK_MS back to PENDING. */
async function reclaimStaleJobs(): Promise<number> {
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
  return basePrisma.$executeRaw`
    UPDATE "jobs"
    SET status = 'PENDING', "lockedAt" = NULL
    WHERE status = 'RUNNING' AND "lockedAt" < ${staleBefore}
  `;
}

async function runJob(job: Job): Promise<void> {
  // Split the raw payload from the metadata, and hand the handler an already-scoped
  // client so it can never reach an unscoped one (docs/architecture.md §8).
  const { payload, ...meta } = job;
  const db = orgDb(job.orgId);
  try {
    await handlers[job.type](db, payload, meta);
    await db.job.update({
      where: { id: job.id },
      data: { status: "DONE", lockedAt: null, lastError: null },
    });
    logger.info("job done", { jobId: job.id, orgId: job.orgId, type: job.type });
  } catch (err) {
    const attempts = job.attempts + 1;
    const failed = attempts >= job.maxRetries;
    const backoffMs = BASE_BACKOFF_MS * 2 ** (attempts - 1);
    await db.job.update({
      where: { id: job.id },
      data: {
        attempts,
        status: failed ? "FAILED" : "PENDING",
        runAt: failed ? job.runAt : new Date(Date.now() + backoffMs),
        lockedAt: null,
        lastError: err instanceof Error ? err.message : String(err),
      },
    });
    logger.warn("job failed", { jobId: job.id, orgId: job.orgId, type: job.type, attempts, failed });
  }
}

/** One poll iteration: reclaim stale locks, claim due jobs, dispatch each. */
export async function tick(): Promise<void> {
  const reclaimed = await reclaimStaleJobs();
  if (reclaimed > 0) logger.info("reclaimed stale jobs", { count: reclaimed });

  const jobs = await claimJobs();
  if (jobs.length > 0) logger.info("claimed jobs", { count: jobs.length });

  for (const job of jobs) {
    await runJob(job);
  }
}

/** Sleep up to `ms`, resolving early once `shouldStop()` returns true (responsive Ctrl+C). */
function sleep(ms: number, shouldStop: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const step = 250;
    let elapsed = 0;
    const id = setInterval(() => {
      elapsed += step;
      if (elapsed >= ms || shouldStop()) {
        clearInterval(id);
        resolve();
      }
    }, step);
  });
}

/** Start the poll loop. Runs until SIGINT/SIGTERM, then disconnects cleanly. */
export async function startRunner(): Promise<void> {
  logger.info("job runner starting", { pollIntervalMs: POLL_INTERVAL_MS });

  const shutdown = () => {
    stopped = true;
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  while (!stopped) {
    try {
      await tick();
    } catch (err) {
      // A poll failure (e.g. DB unavailable) must not kill the loop; log and retry.
      logger.error("poll tick failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (!stopped) await sleep(POLL_INTERVAL_MS, () => stopped);
  }

  await basePrisma.$disconnect();
  logger.info("job runner stopped");
}
