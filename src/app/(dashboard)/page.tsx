import Link from "next/link";
import { getCurrentCtx } from "@/server/auth/session";
import { createOrgInvite } from "@/server/services/invites";
import { listMembers, getMe } from "@/server/services/users";
import { listOrgTasks } from "@/server/services/tasks";
import { listProjects } from "@/server/services/projects";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Avatar } from "@/components/Avatar";
import { PortalShell, type PortalTab } from "@/components/PortalShell";
import { LoginForm } from "./LoginForm";
import { CopyLink } from "./CopyLink";
import { CreateTaskForm } from "./CreateTaskForm";
import { CreateProjectForm } from "./CreateProjectForm";
import { TaskBoard } from "./TaskBoard";
import { logoutAction } from "./actions";

export default async function DashboardPage() {
  const ctx = await getCurrentCtx();
  if (!ctx) return <LoginForm />;

  const [invite, members, tasks, projects, me] = await Promise.all([
    createOrgInvite(ctx),
    listMembers(ctx),
    listOrgTasks(ctx),
    listProjects(ctx),
    getMe(ctx),
  ]);
  const username = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  const inviteUrl = username ? `https://t.me/${username}?start=${invite.token}` : null;
  const activeMembers = members.filter((m) => m.status === "ACTIVE").length;
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  const tabs: PortalTab[] = [
    { id: "tasks", label: t(ctx.locale, "dashboard.tasks_heading"), badge: tasks.length },
    { id: "projects", label: t(ctx.locale, "projects.heading"), badge: projects.length },
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
            <CreateTaskForm members={members} locale={ctx.locale} projects={projectOptions} />
          </div>
        </details>
        <TaskBoard tasks={tasks} locale={ctx.locale} />
      </section>
    ),
    projects: (
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {t(ctx.locale, "projects.heading")}
        </h2>
        <details className="group mt-5">
          <summary className="btn btn-soft w-full cursor-pointer justify-between [&::-webkit-details-marker]:hidden">
            <span>{t(ctx.locale, "projects.new")}</span>
            <span className="text-lg leading-none text-muted transition-transform duration-200 group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="card mt-3 p-5">
            <CreateProjectForm members={members} locale={ctx.locale} />
          </div>
        </details>

        {projects.length === 0 ? (
          <div className="card mt-5 p-8 text-center">
            <p className="text-sm text-muted">{t(ctx.locale, "projects.empty")}</p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="card card-hover block h-full p-4">
                  <span className="block font-medium">{p.name}</span>
                  {p.description ? (
                    <span className="mt-1 line-clamp-2 block text-sm text-muted">
                      {p.description}
                    </span>
                  ) : null}
                  <span className="mt-3 flex gap-2">
                    <span className="badge">
                      {t(ctx.locale, "projects.count_members", { count: p._count.members })}
                    </span>
                    <span className="badge">
                      {t(ctx.locale, "projects.count_tasks", { count: p._count.tasks })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
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
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-2"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar user={m} size={32} />
                    <span className="truncate font-medium">
                      {m.name.trim() === "" ? "—" : m.name}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-sm">
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
      {me ? (
        <Link href="/profile" aria-label={t(ctx.locale, "profile.heading")} className="mr-1">
          <Avatar user={me} size={32} />
        </Link>
      ) : null}
      <LanguageSelector current={ctx.locale} />
      <ThemeToggle />
      <form action={logoutAction}>
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
