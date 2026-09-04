import type { JobHandler } from "../types";
import { logger } from "@/lib/logger";

/** TASK_REMINDER: send a Telegram reminder before a task deadline (docs/architecture.md §8). */
export const handleTaskReminder: JobHandler = async (_db, _payload, job) => {
  logger.warn("TASK_REMINDER handler not yet implemented", { jobId: job.id });
};
