import type { JobHandler } from "../types";
import { logger } from "@/lib/logger";

/** END_OF_DAY_NUDGE: message assignees with untouched tasks (docs/architecture.md §8). */
export const handleEndOfDayNudge: JobHandler = async (_db, _payload, job) => {
  logger.warn("END_OF_DAY_NUDGE handler not yet implemented", { jobId: job.id });
};
