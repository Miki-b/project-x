import type { Prisma, Task, TaskSource, TaskStatus, TaskUpdate } from "@/generated/prisma/client";
import type { Ctx } from "@/types";
import { InvalidTransition, NotAuthorised, ProofEmpty, ReasonRequired, TaskNotFound } from "@/types";
import { orgDb } from "@/server/db/client";

/**
 * Task service (docs/architecture.md §7). CORE business logic. Every status change writes
 * the `tasks` row + a `task_updates` row + an enqueued notification job in ONE transaction.
 * Authorisation happens here. Members may only move their own tasks.
 */

const REMINDER_LEAD_MS = 60 * 60 * 1000; // remind ~1h before the deadline

// Allowed target statuses per current status (docs/architecture.md §7 state machine).
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ["IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"],
  IN_PROGRESS: ["BLOCKED", "DONE", "CANCELLED"],
  BLOCKED: ["IN_PROGRESS", "DONE", "CANCELLED"],
  DONE: ["IN_PROGRESS"], // reopen — manager only (enforced below)
  CANCELLED: [],
};

function isManager(ctx: Ctx): boolean {
  return ctx.role === "OWNER" || ctx.role === "MANAGER";
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  assigneeId: string;
  dueAt?: Date;
  source?: TaskSource;
};

/** Create + assign a task. Manager-only. Enqueues a TASK_REMINDER when there is a deadline. */
export async function createTask(ctx: Ctx, input: CreateTaskInput): Promise<Task> {
  if (!isManager(ctx)) throw new NotAuthorised();
  const db = orgDb(ctx.orgId);

  // The assignee must be a member of this org (orgDb scopes the lookup).
  const assignee = await db.user.findFirst({ where: { id: input.assigneeId } });
  if (!assignee) throw new NotAuthorised("Assignee is not a member of this organisation");

  return db.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        orgId: ctx.orgId,
        title: input.title,
        description: input.description ?? null,
        assigneeId: input.assigneeId,
        createdById: ctx.actorId,
        dueAt: input.dueAt ?? null,
        source: input.source ?? "MANUAL",
        status: "PENDING",
      },
    });

    await tx.taskUpdate.create({
      data: {
        orgId: ctx.orgId,
        taskId: task.id,
        actorId: ctx.actorId,
        type: "ASSIGNMENT",
        toStatus: "PENDING",
      },
    });

    // Notify the assignee immediately via Telegram (flow b, docs/bot_flows.md §3).
    await tx.job.create({
      data: {
        orgId: ctx.orgId,
        type: "TASK_NOTIFICATION",
        runAt: new Date(),
        payload: { taskId: task.id, isNew: true } satisfies Prisma.InputJsonObject,
      },
    });

    if (input.dueAt) {
      const runAt = new Date(Math.max(Date.now(), input.dueAt.getTime() - REMINDER_LEAD_MS));
      await tx.job.create({
        data: {
          orgId: ctx.orgId,
          type: "TASK_REMINDER",
          runAt,
          dedupeKey: `reminder:${task.id}:${runAt.toISOString()}`,
          payload: { taskId: task.id } satisfies Prisma.InputJsonObject,
        },
      });
    }

    return task;
  });
}

/** Validate a transition against the state machine and the actor's role. */
function assertTransition(from: TaskStatus, to: TaskStatus, ctx: Ctx): void {
  if (!TRANSITIONS[from].includes(to)) throw new InvalidTransition(from, to);
  // Cancelling and reopening (DONE -> IN_PROGRESS) are manager-only.
  if (to === "CANCELLED" && !isManager(ctx)) throw new NotAuthorised();
  if (from === "DONE" && to === "IN_PROGRESS" && !isManager(ctx)) throw new NotAuthorised();
}

/**
 * Change a task's status. One transaction: the `tasks` row, a STATUS_CHANGE `task_updates`
 * row, and a notification job. BLOCKED requires a reason. DONE sets `completedAt`; reopening
 * clears it. Members may only move their own tasks.
 */
export async function changeStatus(
  ctx: Ctx,
  taskId: string,
  to: TaskStatus,
  note?: string,
): Promise<Task> {
  const db = orgDb(ctx.orgId);

  const task = await db.task.findFirst({ where: { id: taskId } });
  if (!task) throw new TaskNotFound(taskId);
  if (!isManager(ctx) && task.assigneeId !== ctx.actorId) throw new NotAuthorised();

  assertTransition(task.status, to, ctx);
  const reason = note?.trim();
  if (to === "BLOCKED" && !reason) throw new ReasonRequired();

  const completedAt =
    to === "DONE" ? new Date() : task.status === "DONE" ? null : task.completedAt;

  return db.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: { status: to, completedAt },
    });

    await tx.taskUpdate.create({
      data: {
        orgId: ctx.orgId,
        taskId,
        actorId: ctx.actorId,
        type: "STATUS_CHANGE",
        fromStatus: task.status,
        toStatus: to,
        note: reason ?? null,
      },
    });

    // Outbound notification enqueued in the same transaction (§7). The handler edits/sends
    // the assignee's bot card to reflect the new status.
    await tx.job.create({
      data: {
        orgId: ctx.orgId,
        type: "TASK_NOTIFICATION",
        runAt: new Date(),
        payload: {
          taskId,
          fromStatus: task.status,
          toStatus: to,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return updated;
  });
}

export type ProofInput = {
  mediaType?: "photo" | "voice" | "document";
  telegramFileId?: string;
  note?: string;
};

/** Attach proof (photo/voice/text) to a task. Only the assignee may attach. */
export async function attachProof(
  ctx: Ctx,
  taskId: string,
  proof: ProofInput,
): Promise<TaskUpdate> {
  const hasMedia = Boolean(proof.telegramFileId);
  const hasNote = Boolean(proof.note?.trim());
  if (!hasMedia && !hasNote) throw new ProofEmpty();

  const db = orgDb(ctx.orgId);
  const task = await db.task.findFirst({ where: { id: taskId } });
  if (!task) throw new TaskNotFound(taskId);
  if (task.assigneeId !== ctx.actorId) throw new NotAuthorised();

  return db.taskUpdate.create({
    data: {
      orgId: ctx.orgId,
      taskId,
      actorId: ctx.actorId,
      type: "PROOF",
      telegramFileId: proof.telegramFileId ?? null,
      mediaType: proof.mediaType ?? null,
      note: proof.note?.trim() ?? null,
    },
  });
}

/** The assignee's tasks, flat, sorted by due date (overdue first; no-due last). */
export async function listTasksForAssignee(ctx: Ctx, assigneeId: string): Promise<Task[]> {
  if (!isManager(ctx) && assigneeId !== ctx.actorId) throw new NotAuthorised();
  return orgDb(ctx.orgId).task.findMany({
    where: { assigneeId },
    orderBy: [{ dueAt: "asc" }],
  });
}

export type TaskWithHistory = Prisma.TaskGetPayload<{
  include: {
    assignee: true;
    updates: { include: { actor: true } };
  };
}>;

export type TaskWithAssignee = Prisma.TaskGetPayload<{
  include: { assignee: true };
}>;

/** All tasks in the org for the manager board — flat, sorted by due date (no-due last). */
export async function listOrgTasks(ctx: Ctx): Promise<TaskWithAssignee[]> {
  if (!isManager(ctx)) throw new NotAuthorised();
  return orgDb(ctx.orgId).task.findMany({
    include: { assignee: true },
    orderBy: [{ dueAt: "asc" }],
  });
}

/** A single task with its full update history. Members may only view their own. */
export async function getTask(ctx: Ctx, taskId: string): Promise<TaskWithHistory> {
  const task = await orgDb(ctx.orgId).task.findFirst({
    where: { id: taskId },
    include: {
      assignee: true,
      updates: { include: { actor: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!task) throw new TaskNotFound(taskId);
  if (!isManager(ctx) && task.assigneeId !== ctx.actorId) throw new NotAuthorised();
  return task;
}
