import { Api } from "grammy";
import { z } from "zod";
import { basePrisma } from "@/server/db/client";
import { logger } from "@/lib/logger";
import { taskCardText } from "@/server/telegram/messages/task";
import { taskKeyboard } from "@/server/telegram/keyboards";
import type { JobHandler } from "../types";
import type { Locale } from "@/types";

/**
 * TASK_NOTIFICATION: send the assignee's Telegram task card (docs/architecture.md §8,
 * bot_flows.md flow b). Enqueued by createTask (isNew=true) and changeStatus (status change).
 *
 * Edit-in-place requires storing the sent message_id on the task. The existing schema has no
 * field for this — see the migration proposal (tasks.telegramMessageId Int?) in the session
 * report. Until that migration runs, this handler sends a new card each time. Inline button
 * taps still edit in-place because the callback context already holds the message_id.
 */

const PayloadSchema = z.object({
  taskId: z.string(),
  isNew: z.boolean().optional(),
});

function asLocale(v: string): Locale {
  return v === "am" ? "am" : "en";
}

export const handleTaskNotification: JobHandler = async (db, rawPayload, _job) => {
  const { taskId, isNew } = PayloadSchema.parse(rawPayload);

  const task = await db.task.findFirst({
    where: { id: taskId },
    include: { assignee: true, createdBy: true },
  });

  if (!task) {
    logger.warn("TASK_NOTIFICATION: task not found, skipping", { taskId });
    return;
  }

  if (!task.assignee.telegramChatId) {
    logger.warn("TASK_NOTIFICATION: assignee has no telegramChatId, skipping", {
      taskId,
      assigneeId: task.assignee.id,
    });
    return;
  }

  // Organization is the root table (no orgId field); look it up by PK via basePrisma.
  // This is safe: the job runner already verified job.orgId === task.orgId.
  const org = await basePrisma.organization.findUnique({ where: { id: task.orgId } });
  const locale = asLocale(org?.locale ?? "en");

  let blockedReason: string | null = null;
  if (task.status === "BLOCKED") {
    const latestBlock = await db.taskUpdate.findFirst({
      where: { taskId: task.id, toStatus: "BLOCKED" },
      orderBy: { createdAt: "desc" },
    });
    blockedReason = latestBlock?.note ?? null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  const text = taskCardText({
    title: task.title,
    status: task.status,
    dueAt: task.dueAt,
    fromName: task.createdBy.name || "—",
    locale,
    completedAt: task.completedAt,
    blockedReason,
    isNew: isNew ?? false,
  });
  const keyboard = taskKeyboard(task.id, task.status, locale, appUrl);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  const api = new Api(token);
  // BigInt → string to avoid precision loss and satisfy grammy's ChatId type
  const chatId = task.assignee.telegramChatId.toString();

  await api.sendMessage(chatId, text, { reply_markup: keyboard });

  logger.info("TASK_NOTIFICATION sent", { taskId, assigneeId: task.assignee.id });
};
