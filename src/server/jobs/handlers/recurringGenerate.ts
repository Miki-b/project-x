import type { JobHandler } from "../types";
import { logger } from "@/lib/logger";

/** RECURRING_GENERATE: materialise tasks from active templates (docs/architecture.md §8). */
export const handleRecurringGenerate: JobHandler = async (_db, _payload, job) => {
  logger.warn("RECURRING_GENERATE handler not yet implemented", { jobId: job.id });
};
