import { getCurrentCtx } from "@/server/auth/session";
import { createOrgInvite } from "@/server/services/invites";
import { listMembers } from "@/server/services/users";
import { listOrgTasks } from "@/server/services/tasks";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PortalShell, type PortalTab } from "@/components/PortalShell";
import { LoginForm } from "./LoginForm";
import { CopyLink } from "./CopyLink";
import { CreateTaskForm } from "./CreateTaskForm";
import { TaskBoard } from "./TaskBoard";
import { logoutAction } from "./actions";

export default async function DashboardPage() {
  const ctx = await getCurrentCtx();
  if (!ctx) return <LoginForm />;

  const [invite, members, tasks] = await Promise.all([
    createOrgInvite(ctx),
    listMembers(ctx),
    listOrgTasks(ctx),
  ]);
  const username = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  const inviteUrl = username ? `https://t.me/${username}?start=${invite.token}` : null;
  const activeMembers = members.filter((m) => m.status === "ACTIVE").length;

  const tabs: PortalTab[] = [
    { id: "tasks", label: t(ctx.locale, "dashboard.tasks_heading"), badge: tasks.length },
    { id: "team", label: t(ctx.locale, "dashboard.team_heading"), badge: activeMembers },
    { id: "invite", label: t(ctx.locale, "dashboard.invite_heading") },
  ];

  const sections = {
    tasks: (
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {t(ctx.locale, "dashboard.tasks_heading")}
        </h2>
        <details className="group mt-5">
          <summary className="btn btn-soft w-full cursor-pointer justify-between [&::-webkit-details-marker]:hidden">
            <span>{t(ctx.locale, "dashboard.create_task_heading")}</span>
            <span className="text-lg leading-none text-muted transition-transform duration-200 group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="card mt-3 p-5">
            <CreateTaskForm members={members} locale={ctx.locale} />
          </div>
        </details>
        <TaskBoard tasks={tasks} locale={ctx.locale} />
      </section>
    ),
    team: (
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {t(ctx.locale, "dashboard.team_heading")}
        </h2>
        <div className="card mt-5 overflow-hidden">
          {members.length === 0 ? (
            <p className="p-6 text-sm text-muted">{t(ctx.locale, "dashboard.empty_team")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-surface-2"
                >
                  <span className="font-medium">{m.name.trim() === "" ? "—" : m.name}</span>
                  <span className="flex items-center gap-2 text-sm">
                    <span className="badge">{t(ctx.locale, `role.${m.role}`)}</span>
                    <span className="text-muted">{t(ctx.locale, `team.status.${m.status}`)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    ),
    invite: (
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {t(ctx.locale, "dashboard.invite_heading")}
        </h2>
        <div className="card mt-5 p-6">
          <p className="text-sm text-muted">{t(ctx.locale, "dashboard.invite_help")}</p>
          {inviteUrl ? (
            <div className="mt-4">
              <CopyLink url={inviteUrl} locale={ctx.locale} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-amber-500">
              {t(ctx.locale, "dashboard.no_username", { token: invite.token })}
            </p>
          )}
        </div>
      </section>
    ),
  };

  const headerRight = (
    <>
      <ThemeToggle />
      <form action={logoutAction} className="lg:ml-auto">
        <button type="submit" className="btn btn-ghost h-9 px-3">
          {t(ctx.locale, "dashboard.logout")}
        </button>
      </form>
    </>
  );

  return (
    <PortalShell
      brand={t(ctx.locale, "dashboard.title")}
      tabs={tabs}
      sections={sections}
      headerRight={headerRight}
    />
  );
}
