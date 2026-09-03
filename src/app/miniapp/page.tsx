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
      <h1 className="mb-3 text-lg font-semibold">{t(ctx.locale, "miniapp.title")}</h1>
      {tasks.length === 0 ? (
        <p className="text-sm text-zinc-500">{t(ctx.locale, "miniapp.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/miniapp/tasks/${task.id}`}
                className="block rounded-lg border border-zinc-200 p-3 active:bg-zinc-100 dark:border-zinc-800 dark:active:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{task.title}</span>
                  <StatusBadge status={task.status} locale={ctx.locale} />
                </div>
                <div className="mt-1 text-xs text-zinc-500">
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
