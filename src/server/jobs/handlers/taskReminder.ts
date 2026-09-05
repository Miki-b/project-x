import { z } from "zod";
import type { TaskStatus } from "@/generated/prisma/client";
import { sendTaskCardToAssignee } from "@/server/telegram/deliver";
import { logger } from "@/lib/logger";
import type { JobHandler } from "../types";

/**
 * TASK_REMINDER: nudge the assignee shortly before a task's deadline (docs/architecture.md §8).
 * Enqueued by createTask when a due date is set; processed by the cron tick (/api/cron/tick).
 * Skips tasks that are already finished so we never nag about a completed/cancelled task.
 */

const PayloadSchema = z.object({ taskId: z.string() });

// Only these statuses still warrant a due-date reminder.
const REMINDABLE = new Set<TaskStatus>(["PENDING", "IN_PROGRESS", "BLOCKED"]);

export const handleTaskReminder: JobHandler = async (db, rawPayload, job) => {
  const { taskId } = PayloadSchema.parse(rawPayload);

  const task = await db.task.findFirst({ where: { id: taskId } });
  if (!task) {
    logger.warn("TASK_REMINDER: task not found, skipping", { taskId });
    return;
  }
  if (!REMINDABLE.has(task.status)) {
    logger.info("TASK_REMINDER: task already finished, skipping", { taskId, status: task.status });
    return;
  }

  await sendTaskCardToAssignee(job.orgId, taskId, false, { headerKey: "task.reminder.header" });
  logger.info("TASK_REMINDER sent", { taskId });
};
