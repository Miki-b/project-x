import type { TaskStatus } from "@/generated/prisma/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import { formatInAddis } from "@/lib/time";

const BADGE_COLORS: Record<TaskStatus, string> = {
  PENDING: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  IN_PROGRESS: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  DONE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  BLOCKED: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  CANCELLED: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
};

export function StatusBadge({ status, locale }: { status: TaskStatus; locale: Locale }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_COLORS[status]}`}
    >
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
