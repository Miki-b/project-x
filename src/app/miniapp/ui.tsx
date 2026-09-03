import type { TaskStatus } from "@/generated/prisma/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import { formatInAddis } from "@/lib/time";

const BADGE_COLORS: Record<TaskStatus, string> = {
  PENDING: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DONE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  BLOCKED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  CANCELLED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

export function StatusBadge({ status, locale }: { status: TaskStatus; locale: Locale }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${BADGE_COLORS[status]}`}>
      {t(locale, `task.status.${status}`)}
    </span>
  );
}

/** Human due label in Addis time, with an "Overdue" prefix for past-due open tasks. */
export function dueLabel(dueAt: Date | null, status: TaskStatus, locale: Locale): string {
  if (!dueAt) return t(locale, "miniapp.no_due");
  const formatted = formatInAddis(dueAt, "LLL d · HH:mm");
  const overdue = dueAt.getTime() < Date.now() && status !== "DONE" && status !== "CANCELLED";
  return overdue
    ? `${t(locale, "miniapp.overdue")} · ${formatted}`
    : t(locale, "miniapp.due", { due: formatted });
}
