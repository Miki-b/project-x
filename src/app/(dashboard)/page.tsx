import { getCurrentCtx } from "@/server/auth/session";
import { createOrgInvite } from "@/server/services/invites";
import { listMembers } from "@/server/services/users";
import { listOrgTasks } from "@/server/services/tasks";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";
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

  return (
    <>
      <header className="glass sticky top-0 z-20 border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg shadow-[var(--shadow-primary)]">
              <BrandMark size={18} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              {t(ctx.locale, "dashboard.title")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={logoutAction}>
              <button type="submit" className="btn btn-ghost h-9 px-3">
                {t(ctx.locale, "dashboard.logout")}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-8">
        <section className="animate-rise">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold">
              {t(ctx.locale, "dashboard.tasks_heading")}
            </h2>
            <span className="badge">{tasks.length}</span>
          </div>

          <details className="group mt-4">
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

        <section className="animate-rise rise-1 mt-12">
          <h2 className="font-display text-xl font-semibold">
            {t(ctx.locale, "dashboard.invite_heading")}
          </h2>
          <div className="card mt-3 p-5">
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

        <section className="animate-rise rise-2 mt-12">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold">
              {t(ctx.locale, "dashboard.team_heading")}
            </h2>
            <span className="badge">{activeMembers}</span>
          </div>
          <div className="card mt-3 overflow-hidden">
            {members.length === 0 ? (
              <p className="p-5 text-sm text-muted">{t(ctx.locale, "dashboard.empty_team")}</p>
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
      </main>
    </>
  );
}
