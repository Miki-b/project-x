import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentCtx } from "@/server/auth/session";
import { getProject } from "@/server/services/projects";
import { listProjectTasks } from "@/server/services/tasks";
import { listProjectAttachments } from "@/server/services/attachments";
import { listMembers } from "@/server/services/users";
import { NotAuthorised } from "@/types";
import { t } from "@/lib/i18n";
import { FileUpload } from "@/components/FileUpload";
import { AttachmentList } from "@/components/AttachmentList";
import { TaskBoard } from "../../TaskBoard";
import { setProjectMembersAction, archiveProjectAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentCtx();
  if (!ctx) redirect("/");

  let project;
  try {
    project = await getProject(ctx, id);
  } catch (err) {
    if (err instanceof NotAuthorised) notFound();
    throw err;
  }

  const [tasks, members, files] = await Promise.all([
    listProjectTasks(ctx, id),
    listMembers(ctx),
    listProjectAttachments(ctx, id),
  ]);
  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  const memberIds = new Set(project.members.map((m) => m.userId));
  const isManager = ctx.role === "OWNER" || ctx.role === "MANAGER";

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8">
      <Link href="/" className="link text-sm">
        {t(ctx.locale, "dashboard.back")}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.description ? (
            <p className="mt-1 text-sm text-muted">{project.description}</p>
          ) : null}
        </div>
        <form action={archiveProjectAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <button type="submit" className="btn btn-ghost h-9 px-3 text-sm">
            {t(ctx.locale, "projects.archive")}
          </button>
        </form>
      </div>

      {/* Members management */}
      <section className="animate-rise mt-8">
        <h2 className="font-display text-lg font-semibold">{t(ctx.locale, "projects.members")}</h2>
        <form action={setProjectMembersAction} className="card mt-3 p-5">
          <input type="hidden" name="projectId" value={project.id} />
          {activeMembers.length === 0 ? (
            <p className="text-sm text-muted">{t(ctx.locale, "dashboard.empty_team")}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {activeMembers.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={m.id}
                    defaultChecked={memberIds.has(m.id)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <span className="truncate">{m.name || "—"}</span>
                </label>
              ))}
            </div>
          )}
          <button type="submit" className="btn btn-primary mt-4 self-start">
            {t(ctx.locale, "projects.save_members")}
          </button>
        </form>
      </section>

      {/* Project files */}
      <section className="animate-rise rise-1 mt-10">
        <h2 className="font-display text-lg font-semibold">{t(ctx.locale, "files.heading")}</h2>
        <div className="card mt-3 flex flex-col gap-4 p-5">
          <FileUpload kind="project" id={project.id} locale={ctx.locale} />
          <AttachmentList
            attachments={files}
            locale={ctx.locale}
            actorId={ctx.actorId}
            isManager={isManager}
          />
        </div>
      </section>

      {/* Project tasks */}
      <section className="animate-rise rise-2 mt-10">
        <h2 className="font-display text-lg font-semibold">{t(ctx.locale, "projects.tasks")}</h2>
        <TaskBoard tasks={tasks} locale={ctx.locale} />
      </section>
    </main>
  );
}
