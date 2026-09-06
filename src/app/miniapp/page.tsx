import Link from "next/link";
import { getMiniAppCtx } from "@/server/auth/session";
import { listTasksForAssignee } from "@/server/services/tasks";
import { t } from "@/lib/i18n";
import { MiniAppAuth } from "./MiniAppAuth";
import { StatusBadge, dueLabel } from "./ui";

// Employee task list: flat, sorted by due date (overdue first). Tapping opens the detail.
export default async function MiniAppPage() {
  const ctx = await getMiniAppCtx();
  if (!ctx) return <MiniAppAuth />;

  const tasks = await listTasksForAssignee(ctx, ctx.actorId);

  return (
    <main className="p-4">
      <h1 className="mb-4 font-display text-xl font-semibold tracking-tight">
        {t(ctx.locale, "miniapp.title")}
      </h1>
      {tasks.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-muted">{t(ctx.locale, "miniapp.empty")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {tasks.map((task, i) => (
            <li key={task.id} className="animate-rise" style={{ animationDelay: `${i * 0.04}s` }}>
              <Link
                href={`/miniapp/tasks/${task.id}`}
                className="card card-hover block p-4 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{task.title}</span>
                  <StatusBadge status={task.status} locale={ctx.locale} />
                </div>
                <div className="mt-1.5 text-xs text-muted">
                  {dueLabel(task.dueAt, task.status, ctx.locale)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
