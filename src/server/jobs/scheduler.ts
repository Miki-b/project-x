import { DateTime } from "luxon";
import { Prisma } from "@/generated/prisma/client";
import { basePrisma } from "@/server/db/client";
import { logger } from "@/lib/logger";

/**
 * Recurring-job scheduler (docs/architecture.md §8, bot_flows.md §g). Called at the start of
 * every cron tick. Enqueues time-of-day jobs that have become due, idempotently: the unique
 * `Job.dedupeKey` guarantees at most one per org per local day, so calling this on every tick
 * (~15 min) is safe. This is trusted cross-org infrastructure, so it uses basePrisma directly.
 */

// End of the workday, in each org's own timezone. The summary fires on the first tick after this.
const SUMMARY_HOUR = 18;
const DEFAULT_TZ = "Africa/Addis_Ababa";

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** Enqueue a DAILY_SUMMARY for every org whose local time has passed SUMMARY_HOUR today. */
export async function enqueueDueScheduledJobs(): Promise<void> {
  const orgs = await basePrisma.organization.findMany({ select: { id: true, timezone: true } });
  const nowUtc = DateTime.utc();

  for (const org of orgs) {
    const local = nowUtc.setZone(org.timezone || DEFAULT_TZ);
    if (!local.isValid || local.hour < SUMMARY_HOUR) continue;

    const localDate = local.toFormat("yyyy-LL-dd");
    try {
      await basePrisma.job.create({
        data: {
          orgId: org.id,
          type: "DAILY_SUMMARY",
          runAt: new Date(),
          dedupeKey: `summary:${org.id}:${localDate}`,
          payload: { date: localDate },
        },
      });
      logger.info("enqueued DAILY_SUMMARY", { orgId: org.id, date: localDate });
    } catch (err) {
      // Already enqueued for this org+day (dedupeKey) — the normal case on later ticks.
      if (!isUniqueViolation(err)) {
        logger.error("scheduler failed to enqueue DAILY_SUMMARY", {
          orgId: org.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}
