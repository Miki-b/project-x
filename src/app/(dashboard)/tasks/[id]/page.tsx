import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentCtx } from "@/server/auth/session";
import { getTask } from "@/server/services/tasks";
import { TaskNotFound } from "@/types";
import { t } from "@/lib/i18n";
import { formatInAddis } from "@/lib/time";

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
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200">
        {t(ctx.locale, "dashboard.back")}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{task.title}</h1>
      {task.description && (
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{task.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {t(ctx.locale, `task.status.${task.status}`)}
        </span>
        <span>{task.assignee.name}</span>
        {task.dueAt ? (
          <span>{formatInAddis(task.dueAt, "LLL d · HH:mm")}</span>
        ) : (
          <span>{t(ctx.locale, "miniapp.no_due")}</span>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium">{t(ctx.locale, "dashboard.task_history")}</h2>
        {task.updates.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">—</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {task.updates.map((u) => (
              <li key={u.id} className="flex gap-3 text-sm">
                <span className="shrink-0 text-zinc-400">
                  {formatInAddis(u.createdAt, "LLL d · HH:mm")}
                </span>
                <div>
                  <span className="font-medium">{t(ctx.locale, `miniapp.update.${u.type}`)}</span>
                  {u.note && (
                    <span className="ml-1 text-zinc-600 dark:text-zinc-400">— {u.note}</span>
                  )}
                  {u.actor && (
                    <span className="ml-1 text-zinc-400">by {u.actor.name}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
