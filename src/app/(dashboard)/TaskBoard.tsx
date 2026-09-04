import type { TaskStatus } from "@/generated/prisma/client";
import type { TaskWithAssignee } from "@/server/services/tasks";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import { formatInAddis } from "@/lib/time";
import { truncateTitle } from "@/server/telegram/messages/task";

const STATUS_ORDER: TaskStatus[] = ["PENDING", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];

const STATUS_BADGE: Record<TaskStatus, string> = {
  PENDING: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  BLOCKED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  CANCELLED: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
};

export function TaskBoard({ tasks, locale }: { tasks: TaskWithAssignee[]; locale: Locale }) {
  if (tasks.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {t(locale, "dashboard.task_board_empty")}
      </p>
    );
  }

  const grouped = new Map<TaskStatus, TaskWithAssignee[]>();
  for (const status of STATUS_ORDER) grouped.set(status, []);
  for (const task of tasks) {
    grouped.get(task.status)?.push(task);
  }

  return (
    <div className="mt-4 space-y-6">
      {STATUS_ORDER.map((status) => {
        const group = grouped.get(status) ?? [];
        if (group.length === 0) return null;
        return (
          <div key={status}>
            <h3 className="mb-2 text-sm font-medium text-zinc-500 uppercase tracking-wide">
              {t(locale, `task.status.${status}`)} ({group.length})
            </h3>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded border border-zinc-200 dark:border-zinc-800">
              {group.map((task) => (
                <li key={task.id}>
                  <a
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {truncateTitle(task.title)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {task.assignee.name}
                        {task.dueAt
                          ? ` · ${formatInAddis(task.dueAt, "LLL d · HH:mm")}`
                          : ""}
                      </span>
                    </div>
                    <span
                      className={`ml-4 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
                    >
                      {t(locale, `task.status.${status}`)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
