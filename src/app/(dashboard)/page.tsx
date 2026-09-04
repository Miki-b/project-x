import { getCurrentCtx } from "@/server/auth/session";
import { createOrgInvite } from "@/server/services/invites";
import { listMembers } from "@/server/services/users";
import { listOrgTasks } from "@/server/services/tasks";
import { t } from "@/lib/i18n";
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

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t(ctx.locale, "dashboard.title")}</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-zinc-600 underline dark:text-zinc-400">
            {t(ctx.locale, "dashboard.logout")}
          </button>
        </form>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium">{t(ctx.locale, "dashboard.tasks_heading")}</h2>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white">
            {t(ctx.locale, "dashboard.create_task_heading")}
          </summary>
          <CreateTaskForm members={members} locale={ctx.locale} />
        </details>
        <TaskBoard tasks={tasks} locale={ctx.locale} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">{t(ctx.locale, "dashboard.invite_heading")}</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t(ctx.locale, "dashboard.invite_help")}
        </p>
        {inviteUrl ? (
          <CopyLink url={inviteUrl} locale={ctx.locale} />
        ) : (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-500">
            {t(ctx.locale, "dashboard.no_username", { token: invite.token })}
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">{t(ctx.locale, "dashboard.team_heading")}</h2>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {t(ctx.locale, "dashboard.empty_team")}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span>{m.name.trim() === "" ? "—" : m.name}</span>
                <span className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <span>{t(ctx.locale, `role.${m.role}`)}</span>
                  <span>{t(ctx.locale, `team.status.${m.status}`)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
