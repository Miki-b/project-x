import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMiniAppCtx } from "@/server/auth/session";
import { getTask, type TaskWithHistory } from "@/server/services/tasks";
import { t } from "@/lib/i18n";
import { formatInAddis } from "@/lib/time";
import type { Locale } from "@/types";
import { StatusBadge, dueLabel } from "@/app/miniapp/ui";
import { TaskActions } from "@/app/miniapp/TaskActions";

// Employee task detail (browser): status actions + a note, plus the full history.
export const dynamic = "force-dynamic";

export default async function EmployeeTaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getMiniAppCtx();
  if (!ctx) redirect("/app/login");

  let task: TaskWithHistory;
  try {
    task = await getTask(ctx, id);
  } catch {
    // TaskNotFound or NotAuthorised — never reveal another org's task.
    notFound();
  }

  return (
    <main className="p-4">
      <Link href="/app" className="text-sm text-zinc-500">
        {t(ctx.locale, "miniapp.back")}
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <h1 className="text-lg font-semibold">{task.title}</h1>
        <StatusBadge status={task.status} locale={ctx.locale} />
      </div>

      {task.description ? (
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{task.description}</p>
      ) : null}

      <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="py-1">{dueLabel(task.dueAt, task.status, ctx.locale)}</div>
        <div className="py-1">
          {t(ctx.locale, "miniapp.assigned_to")}: {task.assignee.name || "—"}
        </div>
      </div>

      <TaskActions taskId={task.id} status={task.status} locale={ctx.locale} />

      <section className="mt-6">
        <h2 className="text-sm font-semibold">{t(ctx.locale, "miniapp.history")}</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {task.updates.map((u) => (
            <li key={u.id} className="rounded-lg bg-zinc-50 p-2 text-sm dark:bg-zinc-900">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{t(ctx.locale, `miniapp.update.${u.type}`)}</span>
                <span>{formatInAddis(u.createdAt, "LLL d · HH:mm")}</span>
              </div>
              {u.type === "STATUS_CHANGE" && u.toStatus ? (
                <div className="mt-0.5">{statusChangeLine(u.fromStatus, u.toStatus, ctx.locale)}</div>
              ) : null}
              {u.note ? <div className="mt-0.5">{u.note}</div> : null}
              {u.actor?.name ? (
                <div className="mt-0.5 text-xs text-zinc-500">{u.actor.name}</div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function statusChangeLine(
  from: TaskWithHistory["updates"][number]["fromStatus"],
  to: NonNullable<TaskWithHistory["updates"][number]["toStatus"]>,
  locale: Locale,
): string {
  const toLabel = t(locale, `task.status.${to}`);
  if (!from) return toLabel;
  return `${t(locale, `task.status.${from}`)} → ${toLabel}`;
}
