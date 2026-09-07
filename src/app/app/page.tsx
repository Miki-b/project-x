import Link from "next/link";
import { redirect } from "next/navigation";
import type { Task } from "@/generated/prisma/client";
import type { Locale } from "@/types";
import { getMiniAppCtx } from "@/server/auth/session";
import { listTasksForAssignee } from "@/server/services/tasks";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PortalShell, type PortalTab } from "@/components/PortalShell";
import { StatusBadge, dueLabel } from "@/app/miniapp/ui";
import { employeeSignOutAction } from "./actions";

// Employee portal (browser). Same session as the Mini App; here obtained via the bot deep-link.
export const dynamic = "force-dynamic";

export default async function EmployeeHome() {
  const ctx = await getMiniAppCtx();
  if (!ctx) redirect("/app/login");

  const tasks = await listTasksForAssignee(ctx, ctx.actorId);
  const active = tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");
  const done = tasks.filter((task) => task.status === "DONE" || task.status === "CANCELLED");

  const tabs: PortalTab[] = [
    { id: "active", label: t(ctx.locale, "employee.active"), badge: active.length },
    { id: "done", label: t(ctx.locale, "task.status.DONE"), badge: done.length },
  ];

  const sections = {
    active: <TaskList tasks={active} locale={ctx.locale} />,
    done: <TaskList tasks={done} locale={ctx.locale} />,
  };

  const headerRight = (
    <>
      <ThemeToggle />
      <form action={employeeSignOutAction} className="lg:ml-auto">
        <button type="submit" className="btn btn-ghost h-9 px-3">
          {t(ctx.locale, "employee.sign_out")}
        </button>
      </form>
    </>
  );

  return (
    <PortalShell
      brand={t(ctx.locale, "miniapp.title")}
      tabs={tabs}
      sections={sections}
      headerRight={headerRight}
    />
  );
}

function TaskList({ tasks, locale }: { tasks: Task[]; locale: Locale }) {
  if (tasks.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-muted">{t(locale, "miniapp.empty")}</p>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task, i) => (
        <li key={task.id} className="animate-rise" style={{ animationDelay: `${i * 0.04}s` }}>
          <Link href={`/app/tasks/${task.id}`} className="card card-hover block h-full p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{task.title}</span>
              <StatusBadge status={task.status} locale={locale} />
            </div>
            <div className="mt-1.5 text-xs text-muted">
              {dueLabel(task.dueAt, task.status, locale)}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
