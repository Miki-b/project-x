import Link from "next/link";
import { redirect } from "next/navigation";
import { getMiniAppCtx } from "@/server/auth/session";
import { listTasksForAssignee } from "@/server/services/tasks";
import { t } from "@/lib/i18n";
import { StatusBadge, dueLabel } from "@/app/miniapp/ui";
import { employeeSignOutAction } from "./actions";

// Employee task list (browser). Same session as the Mini App; here obtained via the Login Widget.
export const dynamic = "force-dynamic";

export default async function EmployeeHome() {
  const ctx = await getMiniAppCtx();
  if (!ctx) redirect("/app/login");

  const tasks = await listTasksForAssignee(ctx, ctx.actorId);

  return (
    <main className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t(ctx.locale, "miniapp.title")}</h1>
        <form action={employeeSignOutAction}>
          <button type="submit" className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200">
            {t(ctx.locale, "employee.sign_out")}
          </button>
        </form>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">{t(ctx.locale, "miniapp.empty")}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/app/tasks/${task.id}`}
                className="block rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
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
