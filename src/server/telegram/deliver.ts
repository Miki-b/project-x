import { Api } from "grammy";
import { basePrisma, orgDb } from "@/server/db/client";
import { logger } from "@/lib/logger";
import { t } from "@/lib/i18n";
import { taskCardText } from "./messages/task";
import { taskKeyboard } from "./keyboards";
import type { Locale } from "@/types";

/**
 * Send the assignee's Telegram task card (docs/bot_flows.md flow b).
 *
 * The app has no always-on worker, so a new task card is delivered INLINE from the Vercel
 * request that creates the task (src/app/(dashboard)/actions.ts). Delivery is best-effort:
 * the caller must not let a send failure fail task creation. Status changes originated from
 * the bot edit the existing card in place (handlers/callbacks.ts) and never come through
 * here. The TASK_NOTIFICATION job handler also delegates here, so a future scheduled
 * processor (e.g. a Vercel cron) can reuse the exact same delivery path.
 */

function asLocale(v: string): Locale {
  return v === "am" ? "am" : "en";
}

export async function sendTaskCardToAssignee(
  orgId: string,
  taskId: string,
  isNew: boolean,
  opts?: { headerKey?: Parameters<typeof t>[1] },
): Promise<void> {
  const db = orgDb(orgId);
  const task = await db.task.findFirst({
    where: { id: taskId },
    include: { assignee: true, createdBy: true },
  });
  if (!task) {
    logger.warn("task card: task not found, skipping", { taskId });
    return;
  }
  if (!task.assignee.telegramChatId) {
    logger.warn("task card: assignee has no telegramChatId, skipping", {
      taskId,
      assigneeId: task.assignee.id,
    });
    return;
  }

  // Organization is the root table (no orgId column); look it up by PK via basePrisma.
  // Safe: orgId is the caller's own scope, resolved from the session/job, never user input.
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
  const card = taskCardText({
    title: task.title,
    status: task.status,
    dueAt: task.dueAt,
    fromName: task.createdBy.name || "—",
    locale,
    completedAt: task.completedAt,
    blockedReason,
    isNew,
  });
  // Optional header line (e.g. the reminder banner) prepended in the assignee's locale.
  const text = opts?.headerKey ? `${t(locale, opts.headerKey)}\n${card}` : card;
  const keyboard = taskKeyboard(task.id, task.status, locale, appUrl);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  const api = new Api(token);
  // BigInt → string to avoid precision loss and satisfy grammy's ChatId type.
  const chatId = task.assignee.telegramChatId.toString();
  await api.sendMessage(chatId, text, { reply_markup: keyboard });

  logger.info("task card sent", { taskId, assigneeId: task.assignee.id });
}
