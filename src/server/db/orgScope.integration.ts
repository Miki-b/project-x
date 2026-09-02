import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { basePrisma, orgDb } from "./client";

/**
 * Integration test for the orgDb tenant-scoping extension (docs/architecture.md §5 rule 2).
 *
 * Verifies that with Prisma's extendedWhereUnique (GA since Prisma 5), injecting `orgId`
 * into `findUnique` / `update` / `delete` `where` clauses actually enforces tenant
 * isolation: org A cannot reach org B's row by id. This is why client.ts injects into the
 * unique `where` rather than falling back to `findFirst`.
 *
 * Requires a real database (DATABASE_URL + DIRECT_URL). Run with `npm run test:integration`.
 * Kept permanently — it guards the single most important invariant in the schema.
 */

let orgAId: string;
let orgBId: string;
let taskAId: string;
let taskBId: string;

before(async () => {
  // Unscoped setup: two independent tenants, each with a user and a task.
  const orgA = await basePrisma.organization.create({ data: { name: "Org A (test)" } });
  const orgB = await basePrisma.organization.create({ data: { name: "Org B (test)" } });
  orgAId = orgA.id;
  orgBId = orgB.id;

  const userA = await basePrisma.user.create({ data: { orgId: orgA.id, name: "A owner" } });
  const userB = await basePrisma.user.create({ data: { orgId: orgB.id, name: "B owner" } });

  const taskA = await basePrisma.task.create({
    data: { orgId: orgA.id, title: "A task", assigneeId: userA.id, createdById: userA.id },
  });
  const taskB = await basePrisma.task.create({
    data: { orgId: orgB.id, title: "B task", assigneeId: userB.id, createdById: userB.id },
  });
  taskAId = taskA.id;
  taskBId = taskB.id;
});

after(async () => {
  // Cascades remove users and tasks.
  await basePrisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await basePrisma.$disconnect();
});

test("findUnique cannot read another org's task by id", async () => {
  const db = orgDb(orgAId);
  const leaked = await db.task.findUnique({ where: { id: taskBId } });
  assert.equal(leaked, null);
});

test("findUnique still returns the caller's own task", async () => {
  const db = orgDb(orgAId);
  const own = await db.task.findUnique({ where: { id: taskAId } });
  assert.ok(own);
  assert.equal(own?.id, taskAId);
});

test("update cannot modify another org's task by id", async () => {
  const db = orgDb(orgAId);
  await assert.rejects(
    () => db.task.update({ where: { id: taskBId }, data: { title: "hijacked" } }),
    "expected P2025 (record not found) — cross-org update must not match",
  );
  // Confirm org B's row is untouched.
  const untouched = await basePrisma.task.findUnique({ where: { id: taskBId } });
  assert.equal(untouched?.title, "B task");
});

test("delete cannot remove another org's task by id", async () => {
  const db = orgDb(orgAId);
  await assert.rejects(() => db.task.delete({ where: { id: taskBId } }));
  const stillThere = await basePrisma.task.findUnique({ where: { id: taskBId } });
  assert.ok(stillThere);
});
