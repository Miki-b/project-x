import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { basePrisma, orgDb } from "@/server/db/client";
import { createTask, changeStatus } from "@/server/services/tasks";
import { sendTaskCardToAssignee } from "@/server/telegram/deliver";
import { handleDailySummary } from "@/server/jobs/handlers/dailySummary";
import { InvalidTransition, NotAuthorised, ReasonRequired, type Ctx } from "@/types";

/**
 * Task lifecycle integration test (docs/architecture.md §7). Requires a database.
 * Run with `npm run test:integration`.
 */

let orgId: string;
let managerId: string;
let memberAId: string;
let memberBId: string;

function ctx(orgIdIn: string, actorId: string, role: Ctx["role"]): Ctx {
  return { orgId: orgIdIn, actorId, role, locale: "en" };
}

before(async () => {
  const org = await basePrisma.organization.create({ data: { name: "Task Test Org" } });
  orgId = org.id;
  const [manager, memberA, memberB] = await Promise.all([
    basePrisma.user.create({ data: { orgId, name: "Manager", role: "OWNER", status: "ACTIVE" } }),
    basePrisma.user.create({ data: { orgId, name: "Member A", role: "MEMBER", status: "ACTIVE" } }),
    basePrisma.user.create({ data: { orgId, name: "Member B", role: "MEMBER", status: "ACTIVE" } }),
  ]);
  managerId = manager.id;
  memberAId = memberA.id;
  memberBId = memberB.id;
});

after(async () => {
  // Delete tasks first (assignee/creator are RESTRICT), then the org cascades the rest.
  await basePrisma.task.deleteMany({ where: { orgId } });
  await basePrisma.organization.deleteMany({ where: { id: orgId } });
  await basePrisma.$disconnect();
});

async function newTask(): Promise<string> {
  const task = await createTask(ctx(orgId, managerId, "OWNER"), {
    title: "Deliver the Bole site report",
    assigneeId: memberAId,
  });
  return task.id;
}

test("createTask does NOT enqueue a TASK_NOTIFICATION job (card is delivered inline)", async () => {
  await createTask(ctx(orgId, managerId, "OWNER"), {
    title: "Notify on create",
    assigneeId: memberAId,
  });
  const job = await basePrisma.job.findFirst({
    where: { orgId, type: "TASK_NOTIFICATION" },
    orderBy: { createdAt: "desc" },
  });
  assert.equal(job, null, "no TASK_NOTIFICATION job should be enqueued");
});

test("createTask with a deadline also enqueues a TASK_REMINDER", async () => {
  const task = await createTask(ctx(orgId, managerId, "OWNER"), {
    title: "With deadline",
    assigneeId: memberAId,
    dueAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
  });
  const jobs = await basePrisma.job.findMany({ where: { orgId, type: "TASK_REMINDER" } });
  assert.ok(jobs.some((j) => (j.payload as { taskId?: string }).taskId === task.id));
});

test("changeStatus writes tasks + task_updates in one transaction (no notification job)", async () => {
  const taskId = await newTask();
  const before = await basePrisma.job.count({ where: { orgId } });

  await changeStatus(ctx(orgId, memberAId, "MEMBER"), taskId, "IN_PROGRESS");

  const task = await basePrisma.task.findUniqueOrThrow({ where: { id: taskId } });
  assert.equal(task.status, "IN_PROGRESS");

  const update = await basePrisma.taskUpdate.findFirst({
    where: { taskId, type: "STATUS_CHANGE" },
    orderBy: { createdAt: "desc" },
  });
  assert.equal(update?.fromStatus, "PENDING");
  assert.equal(update?.toStatus, "IN_PROGRESS");

  // The bot edits the card in place on a status change, so no notification job is enqueued.
  const after = await basePrisma.job.count({ where: { orgId } });
  assert.equal(after, before);
});

test("a member cannot change another member's task", async () => {
  const taskId = await newTask();
  await assert.rejects(
    () => changeStatus(ctx(orgId, memberBId, "MEMBER"), taskId, "IN_PROGRESS"),
    NotAuthorised,
  );
});

test("BLOCKED without a reason is rejected", async () => {
  const taskId = await newTask();
  await assert.rejects(
    () => changeStatus(ctx(orgId, memberAId, "MEMBER"), taskId, "BLOCKED"),
    ReasonRequired,
  );
  await assert.rejects(
    () => changeStatus(ctx(orgId, memberAId, "MEMBER"), taskId, "BLOCKED", "   "),
    ReasonRequired,
  );
  // With a real reason it succeeds and the reason is recorded.
  await changeStatus(ctx(orgId, memberAId, "MEMBER"), taskId, "BLOCKED", "waiting for the printer");
  const update = await basePrisma.taskUpdate.findFirst({
    where: { taskId, type: "STATUS_CHANGE", toStatus: "BLOCKED" },
    orderBy: { createdAt: "desc" },
  });
  assert.equal(update?.note, "waiting for the printer");
});

test("DONE sets completedAt; the update row records fromStatus + toStatus", async () => {
  const taskId = await newTask();
  await changeStatus(ctx(orgId, memberAId, "MEMBER"), taskId, "IN_PROGRESS");
  await changeStatus(ctx(orgId, memberAId, "MEMBER"), taskId, "DONE");

  const task = await basePrisma.task.findUniqueOrThrow({ where: { id: taskId } });
  assert.ok(task.completedAt);

  const update = await basePrisma.taskUpdate.findFirst({
    where: { taskId, type: "STATUS_CHANGE", toStatus: "DONE" },
    orderBy: { createdAt: "desc" },
  });
  assert.equal(update?.fromStatus, "IN_PROGRESS");
  assert.equal(update?.toStatus, "DONE");
});

test("only a manager can CANCEL; a member cannot", async () => {
  const taskId = await newTask();
  await assert.rejects(
    () => changeStatus(ctx(orgId, memberAId, "MEMBER"), taskId, "CANCELLED"),
    NotAuthorised,
  );
  const cancelled = await changeStatus(ctx(orgId, managerId, "OWNER"), taskId, "CANCELLED");
  assert.equal(cancelled.status, "CANCELLED");
});

test("an illegal transition is rejected", async () => {
  const taskId = await newTask();
  await changeStatus(ctx(orgId, memberAId, "MEMBER"), taskId, "DONE");
  // A member cannot reopen a DONE task (manager-only).
  await assert.rejects(
    () => changeStatus(ctx(orgId, memberAId, "MEMBER"), taskId, "IN_PROGRESS"),
    NotAuthorised,
  );
  // CANCELLED is terminal.
  const t2 = await newTask();
  await changeStatus(ctx(orgId, managerId, "OWNER"), t2, "CANCELLED");
  await assert.rejects(
    () => changeStatus(ctx(orgId, managerId, "OWNER"), t2, "IN_PROGRESS"),
    InvalidTransition,
  );
});

// ---------------------------------------------------------------------------
// Inline task card delivery
// ---------------------------------------------------------------------------

test("sendTaskCardToAssignee: assignee with no telegramChatId returns without throwing", async () => {
  // memberAId has no telegramChatId in test setup → the sender should early-return before it
  // ever needs a bot token or makes a Telegram call.
  const task = await createTask(ctx(orgId, managerId, "OWNER"), {
    title: "No-chatId task",
    assigneeId: memberAId,
  });

  await assert.doesNotReject(() => sendTaskCardToAssignee(orgId, task.id, true));
});

// ---------------------------------------------------------------------------
// DAILY_SUMMARY handler
// ---------------------------------------------------------------------------

test("handleDailySummary: no managers on Telegram returns without throwing", async () => {
  // The test org's OWNER has no telegramChatId, so the handler should early-return (no send)
  // regardless of the task counts.
  await createTask(ctx(orgId, managerId, "OWNER"), { title: "Summary task", assigneeId: memberAId });

  const jobRow = await basePrisma.job.create({
    data: {
      orgId,
      type: "DAILY_SUMMARY",
      runAt: new Date(),
      dedupeKey: `summary:${orgId}:test-${Date.now()}`,
      payload: { date: "2026-09-05" },
    },
  });
  const { payload, ...meta } = jobRow;

  await assert.doesNotReject(() => handleDailySummary(orgDb(orgId), payload, meta));
});
