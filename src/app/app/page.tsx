import Link from "next/link";
import { redirect } from "next/navigation";
import { getMiniAppCtx } from "@/server/auth/session";
import { listTasksForAssignee } from "@/server/services/tasks";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";
import { StatusBadge, dueLabel } from "@/app/miniapp/ui";
import { employeeSignOutAction } from "./actions";

// Employee task list (browser). Same session as the Mini App; here obtained via the Login Widget.
export const dynamic = "force-dynamic";

export default async function EmployeeHome() {
  const ctx = await getMiniAppCtx();
  if (!ctx) redirect("/app/login");

  const tasks = await listTasksForAssignee(ctx, ctx.actorId);

  return (
    <>
      <header className="glass sticky top-0 z-20 border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg shadow-[var(--shadow-primary)]">
              <BrandMark size={18} />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              {t(ctx.locale, "miniapp.title")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={employeeSignOutAction}>
              <button type="submit" className="btn btn-ghost h-9 px-3">
                {t(ctx.locale, "employee.sign_out")}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="p-4">
        {tasks.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">{t(ctx.locale, "miniapp.empty")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {tasks.map((task, i) => (
              <li key={task.id} className="animate-rise" style={{ animationDelay: `${i * 0.04}s` }}>
                <Link href={`/app/tasks/${task.id}`} className="card card-hover block p-4">
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
    </>
  );
}
