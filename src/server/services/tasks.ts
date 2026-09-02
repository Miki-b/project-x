import type { Task, TaskStatus } from "@prisma/client";
import type { Ctx } from "@/types";
import type { TaskDraft } from "@/server/ai/schemas";

/**
 * Task service (docs/architecture.md §7). CORE business logic lives here — never in a
 * route or a Telegram handler. Every function takes an explicit actor `Ctx`.
 *
 * Implementation rules (do not implement in this scaffolding session):
 *   - Any status change writes both `tasks` and a `task_updates` row in ONE transaction.
 *   - Any outbound notification is enqueued as a job in the same transaction.
 *   - Authorisation happens here, not in the route (§7). Members may only move their own tasks.
 *   - BLOCKED requires a reason note; DONE sets completedAt; reopening clears it.
 */

export type CreateTaskInput = {
  title: string;
  description?: string;
  assigneeId: string;
  dueAt?: Date;
};

export async function createTask(_ctx: Ctx, _input: CreateTaskInput): Promise<Task> {
  throw new Error("not implemented");
}

/** Confirm AI drafts through the same path as manual creation (§10 rule 1). */
export async function createTasksFromDrafts(_ctx: Ctx, _drafts: TaskDraft[]): Promise<Task[]> {
  throw new Error("not implemented");
}

export async function changeTaskStatus(
  _ctx: Ctx,
  _taskId: string,
  _to: TaskStatus,
  _note?: string,
): Promise<Task> {
  throw new Error("not implemented");
}

export async function listTasksForAssignee(_ctx: Ctx, _assigneeId: string): Promise<Task[]> {
  throw new Error("not implemented");
}

export async function listTasksDueToday(_ctx: Ctx, _assigneeId: string): Promise<Task[]> {
  throw new Error("not implemented");
}
