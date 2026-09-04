import type { JobHandler } from "../types";
import { logger } from "@/lib/logger";

/** DAILY_SUMMARY: send the manager an AI-written recap (docs/architecture.md §8). */
export const handleDailySummary: JobHandler = async (_db, _payload, job) => {
  logger.warn("DAILY_SUMMARY handler not yet implemented", { jobId: job.id });
};
