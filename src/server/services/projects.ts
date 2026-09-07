import type { Prisma, Project } from "@/generated/prisma/client";
import type { Ctx } from "@/types";
import { NotAuthorised } from "@/types";
import { orgDb } from "@/server/db/client";

/**
 * Project service (docs/architecture.md §4.11, §7). Projects are an optional grouping of tasks
 * owned by a specific set of members. Managers manage them; members may view the projects they
 * belong to. All queries are org-scoped via orgDb.
 */

function isManager(ctx: Ctx): boolean {
  return ctx.role === "OWNER" || ctx.role === "MANAGER";
}

class ProjectNotFound extends NotAuthorised {}

export type ProjectWithCounts = Project & {
  _count: { members: number; tasks: number };
};

export type ProjectWithMembers = Prisma.ProjectGetPayload<{
  include: { members: { include: { user: true } }; createdBy: true };
}>;

export type CreateProjectInput = {
  name: string;
  description?: string;
  memberIds: string[];
};

/** Create a project and seat its members. Manager-only. Members must belong to the org. */
export async function createProject(ctx: Ctx, input: CreateProjectInput): Promise<Project> {
  if (!isManager(ctx)) throw new NotAuthorised();
  const db = orgDb(ctx.orgId);

  const memberIds = await validOrgMemberIds(ctx, input.memberIds);

  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        orgId: ctx.orgId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        createdById: ctx.actorId,
      },
    });
    if (memberIds.length > 0) {
      await tx.projectMember.createMany({
        data: memberIds.map((userId) => ({ orgId: ctx.orgId, projectId: project.id, userId })),
        skipDuplicates: true,
      });
    }
    return project;
  });
}

/** Projects for the current actor: managers see all active ones; members see only theirs. */
export async function listProjects(ctx: Ctx): Promise<ProjectWithCounts[]> {
  const db = orgDb(ctx.orgId);
  const where: Prisma.ProjectWhereInput = isManager(ctx)
    ? { archivedAt: null }
    : { archivedAt: null, members: { some: { userId: ctx.actorId } } };

  return db.project.findMany({
    where,
    include: { _count: { select: { members: true, tasks: true } } },
    orderBy: [{ createdAt: "desc" }],
  });
}

/** A single project with members. Managers may view any; members only theirs. */
export async function getProject(ctx: Ctx, projectId: string): Promise<ProjectWithMembers> {
  const db = orgDb(ctx.orgId);
  const project = await db.project.findFirst({
    where: { id: projectId },
    include: { members: { include: { user: true } }, createdBy: true },
  });
  if (!project) throw new ProjectNotFound();
  const isMember = project.members.some((m) => m.userId === ctx.actorId);
  if (!isManager(ctx) && !isMember) throw new NotAuthorised();
  return project;
}

/** Replace a project's member set (manager-only). Members must belong to the org. */
export async function setProjectMembers(
  ctx: Ctx,
  projectId: string,
  memberIds: string[],
): Promise<void> {
  if (!isManager(ctx)) throw new NotAuthorised();
  const db = orgDb(ctx.orgId);

  const project = await db.project.findFirst({ where: { id: projectId } });
  if (!project) throw new ProjectNotFound();

  const valid = await validOrgMemberIds(ctx, memberIds);

  await db.$transaction(async (tx) => {
    await tx.projectMember.deleteMany({ where: { projectId } });
    if (valid.length > 0) {
      await tx.projectMember.createMany({
        data: valid.map((userId) => ({ orgId: ctx.orgId, projectId, userId })),
        skipDuplicates: true,
      });
    }
  });
}

/** Soft-archive a project (manager-only). Its tasks keep their projectId; it leaves the list. */
export async function archiveProject(ctx: Ctx, projectId: string): Promise<void> {
  if (!isManager(ctx)) throw new NotAuthorised();
  await orgDb(ctx.orgId).project.updateMany({
    where: { id: projectId },
    data: { archivedAt: new Date() },
  });
}

/** Names for a set of project ids the actor can see — used to badge tasks cheaply. */
export async function listProjectOptions(ctx: Ctx): Promise<{ id: string; name: string }[]> {
  const db = orgDb(ctx.orgId);
  const where: Prisma.ProjectWhereInput = isManager(ctx)
    ? { archivedAt: null }
    : { archivedAt: null, members: { some: { userId: ctx.actorId } } };
  return db.project.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

/** Keep only ids that are ACTIVE members of this org (prevents cross-org / stale ids). */
async function validOrgMemberIds(ctx: Ctx, ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const rows = await orgDb(ctx.orgId).user.findMany({
    where: { id: { in: unique }, status: "ACTIVE" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
