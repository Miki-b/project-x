import { z } from "zod";
import { sendTaskCardToAssignee } from "@/server/telegram/deliver";
import type { JobHandler } from "../types";

/**
 * TASK_NOTIFICATION job handler (docs/architecture.md §8, bot_flows.md flow b).
 *
 * Not used by the live flow today: new task cards are delivered inline from the web request
 * (src/server/telegram/deliver.ts) and bot-initiated status changes edit the card in place
 * (handlers/callbacks.ts) — the app runs with no always-on worker. This handler is kept and
 * registered so a future scheduled processor (e.g. a Vercel cron) can enqueue notifications
 * and reuse the same delivery path. The runner passes an org-scoped `db`; `job.orgId` is the
 * scope we forward to the shared sender.
 */

const PayloadSchema = z.object({
  taskId: z.string(),
  isNew: z.boolean().optional(),
});

export const handleTaskNotification: JobHandler = async (_db, rawPayload, job) => {
  const { taskId, isNew } = PayloadSchema.parse(rawPayload);
  await sendTaskCardToAssignee(job.orgId, taskId, isNew ?? false);
};
