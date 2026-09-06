import type { TaskStatus } from "@/generated/prisma/client";
import type { TaskWithAssignee } from "@/server/services/tasks";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import { formatInAddis } from "@/lib/time";
import { truncateTitle } from "@/server/telegram/messages/task";

const STATUS_ORDER: TaskStatus[] = ["PENDING", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];

const STATUS_DOT: Record<TaskStatus, string> = {
  PENDING: "bg-zinc-400",
  IN_PROGRESS: "bg-blue-500",
  BLOCKED: "bg-amber-500",
  DONE: "bg-emerald-500",
  CANCELLED: "bg-zinc-300 dark:bg-zinc-600",
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  PENDING: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  IN_PROGRESS: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  BLOCKED: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  DONE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  CANCELLED: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
};

export function TaskBoard({ tasks, locale }: { tasks: TaskWithAssignee[]; locale: Locale }) {
  if (tasks.length === 0) {
    return (
      <div className="card mt-4 p-8 text-center">
        <p className="text-sm text-muted">{t(locale, "dashboard.task_board_empty")}</p>
      </div>
    );
  }

  const grouped = new Map<TaskStatus, TaskWithAssignee[]>();
  for (const status of STATUS_ORDER) grouped.set(status, []);
  for (const task of tasks) grouped.get(task.status)?.push(task);

  return (
    <div className="mt-5 space-y-6">
      {STATUS_ORDER.map((status) => {
        const group = grouped.get(status) ?? [];
        if (group.length === 0) return null;
        return (
          <div key={status}>
            <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
              {t(locale, `task.status.${status}`)}
              <span className="text-muted/70">· {group.length}</span>
            </h3>
            <ul className="card divide-y divide-border overflow-hidden">
              {group.map((task) => {
                const overdue =
                  task.dueAt &&
                  task.dueAt.getTime() < Date.now() &&
                  task.status !== "DONE" &&
                  task.status !== "CANCELLED";
                return (
                  <li key={task.id}>
                    <a
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                    >
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {truncateTitle(task.title)}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                          <span className="truncate">{task.assignee.name}</span>
                          {task.dueAt ? (
                            <>
                              <span aria-hidden>·</span>
                              <span className={overdue ? "text-red-500" : ""}>
                                {formatInAddis(task.dueAt, "LLL d · HH:mm")}
                              </span>
                            </>
                          ) : null}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}
                      >
                        {t(locale, `task.status.${status}`)}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
