import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCtx } from "@/server/auth/session";
import { getTask } from "@/server/services/tasks";
import { TaskNotFound } from "@/types";
import { t } from "@/lib/i18n";
import { formatInAddis } from "@/lib/time";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  IN_PROGRESS: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  BLOCKED: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  DONE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  CANCELLED: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
};

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentCtx();
  if (!ctx) redirect("/");

  const { id } = await params;

  let task;
  try {
    task = await getTask(ctx, id);
  } catch (err) {
    if (err instanceof TaskNotFound) notFound();
    throw err;
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      <Link href="/" className="link text-sm">
        {t(ctx.locale, "dashboard.back")}
      </Link>

      <div className="card animate-rise mt-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[task.status]}`}
          >
            {t(ctx.locale, `task.status.${task.status}`)}
          </span>
        </div>

        {task.description && <p className="mt-3 text-sm text-muted">{task.description}</p>}

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
          <span className="flex flex-col">
            <span className="field-label">{t(ctx.locale, "miniapp.assigned_to")}</span>
            <span className="font-medium">{task.assignee.name}</span>
          </span>
          <span className="flex flex-col">
            <span className="field-label">{t(ctx.locale, "dashboard.task_due")}</span>
            <span className="font-medium">
              {task.dueAt
                ? formatInAddis(task.dueAt, "LLL d · HH:mm")
                : t(ctx.locale, "miniapp.no_due")}
            </span>
          </span>
        </div>
      </div>

      <section className="animate-rise rise-1 mt-8">
        <h2 className="font-display text-lg font-semibold">
          {t(ctx.locale, "dashboard.task_history")}
        </h2>
        {task.updates.length === 0 ? (
          <p className="mt-2 text-sm text-muted">—</p>
        ) : (
          <ul className="mt-4 space-y-4 border-l border-border pl-5">
            {task.updates.map((u) => (
              <li key={u.id} className="relative text-sm">
                <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <div className="text-xs text-muted">
                  {formatInAddis(u.createdAt, "LLL d · HH:mm")}
                </div>
                <div className="mt-0.5">
                  <span className="font-medium">{t(ctx.locale, `miniapp.update.${u.type}`)}</span>
                  {u.note && <span className="text-muted"> — {u.note}</span>}
                  {u.actor && <span className="text-muted"> · {u.actor.name}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
