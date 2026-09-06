import Link from "next/link";
import { notFound } from "next/navigation";
import { getMiniAppCtx } from "@/server/auth/session";
import { getTask, type TaskWithHistory } from "@/server/services/tasks";
import { t } from "@/lib/i18n";
import { formatInAddis } from "@/lib/time";
import type { Locale } from "@/types";
import { MiniAppAuth } from "../../MiniAppAuth";
import { StatusBadge, dueLabel } from "../../ui";
import { TaskActions } from "../../TaskActions";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getMiniAppCtx();
  if (!ctx) return <MiniAppAuth />;

  let task: TaskWithHistory;
  try {
    task = await getTask(ctx, id);
  } catch {
    // TaskNotFound or NotAuthorised — never reveal another org's task.
    notFound();
  }

  return (
    <main className="animate-rise p-4">
      <Link href="/miniapp" className="link text-sm">
        {t(ctx.locale, "miniapp.back")}
      </Link>

      <div className="card mt-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-semibold tracking-tight">{task.title}</h1>
          <StatusBadge status={task.status} locale={ctx.locale} />
        </div>

        {task.description ? (
          <p className="mt-2 text-sm text-muted">{task.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
          <span>{dueLabel(task.dueAt, task.status, ctx.locale)}</span>
          <span className="text-muted">
            {t(ctx.locale, "miniapp.assigned_to")}: {task.assignee.name || "—"}
          </span>
        </div>
      </div>

      <TaskActions taskId={task.id} status={task.status} locale={ctx.locale} />

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">{t(ctx.locale, "miniapp.history")}</h2>
        <ul className="flex flex-col gap-2">
          {task.updates.map((u) => (
            <li key={u.id} className="glass rounded-xl p-2.5 text-sm">
              <div className="flex justify-between text-xs text-muted">
                <span>{t(ctx.locale, `miniapp.update.${u.type}`)}</span>
                <span>{formatInAddis(u.createdAt, "LLL d · HH:mm")}</span>
              </div>
              {u.type === "STATUS_CHANGE" && u.toStatus ? (
                <div className="mt-0.5">{statusChangeLine(u.fromStatus, u.toStatus, ctx.locale)}</div>
              ) : null}
              {u.note ? <div className="mt-0.5">{u.note}</div> : null}
              {u.actor?.name ? (
                <div className="mt-0.5 text-xs text-muted">{u.actor.name}</div>
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
