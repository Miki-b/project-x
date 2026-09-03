import type { JobHandler } from "../types";

/**
 * TASK_NOTIFICATION: send or edit the assignee's Telegram task card to reflect a change
 * (docs/architecture.md §8). Enqueued by the task service on status change. The send
 * implementation lands with the job-runner send path (next session).
 */
export const handleTaskNotification: JobHandler = async (_db, _payload, _job) => {
  throw new Error("not implemented: TASK_NOTIFICATION");
};
