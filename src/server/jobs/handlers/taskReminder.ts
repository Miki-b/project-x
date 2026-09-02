import type { JobHandler } from "../types";

/** TASK_REMINDER: send a Telegram reminder before a task deadline (docs/architecture.md §8). */
export const handleTaskReminder: JobHandler = async (_job) => {
  throw new Error("not implemented: TASK_REMINDER");
};
