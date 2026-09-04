import { InlineKeyboard } from "grammy";
import type { TaskStatus } from "@/generated/prisma/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";

/**
 * Inline keyboards for a task card (docs/bot_flows.md §3, flow b). Row 1 is the "Open Tasks"
 * Web App button; row 2 is the status-specific fallback actions. Callback data is `t:<action>:<taskId>`.
 * Web App buttons require an https `appUrl` at send time.
 */
export function taskKeyboard(
  taskId: string,
  status: TaskStatus,
  locale: Locale,
  appUrl: string,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  // Web App button requires a valid https URL; skip gracefully if NEXT_PUBLIC_APP_URL is unset.
  if (appUrl) {
    kb.webApp(t(locale, "bot.button.open_tasks"), `${appUrl}/miniapp`).row();
  }

  const started = () => kb.text(t(locale, "task.button.started"), `t:start:${taskId}`);
  const done = () => kb.text(t(locale, "task.button.done"), `t:done:${taskId}`);
  const blocked = () => kb.text(t(locale, "task.button.blocked"), `t:block:${taskId}`);

  switch (status) {
    case "PENDING":
      started();
      done();
      blocked();
      break;
    case "IN_PROGRESS":
      done();
      blocked();
      break;
    case "BLOCKED":
      started();
      done();
      break;
    case "DONE":
    case "CANCELLED":
      break;
  }
  return kb;
}

/** Keyboard while awaiting a blocker reason (flow c): only Cancel (+ Open Tasks if configured). */
export function reasonKeyboard(taskId: string, locale: Locale, appUrl: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (appUrl) {
    kb.webApp(t(locale, "bot.button.open_tasks"), `${appUrl}/miniapp`).row();
  }
  return kb.text(t(locale, "bot.button.cancel"), `t:cancelblock:${taskId}`);
}
