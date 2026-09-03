import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { basePrisma } from "@/server/db/client";
import { createOrgInvite, consumeInvite, submitName } from "@/server/services/invites";
import { listMembers } from "@/server/services/users";
import { InviteExpired, InviteInvalid, NotAuthorised, type Ctx } from "@/types";

/**
 * Join-flow integration test (bot flow a, docs/architecture.md §9, §11).
 * Requires a real database (DATABASE_URL). Run with `npm run test:integration`.
 */

let orgAId: string;
let orgBId: string;
let validA: string;
let expiredA: string;

function randId(): bigint {
  return BigInt("0x" + randomBytes(6).toString("hex"));
}
function ctxFor(orgId: string, role: Ctx["role"] = "OWNER"): Ctx {
  return { orgId, actorId: "test-actor", role, locale: "en" };
}

before(async () => {
  const orgA = await basePrisma.organization.create({ data: { name: "Join Test A" } });
  const orgB = await basePrisma.organization.create({ data: { name: "Join Test B" } });
  orgAId = orgA.id;
  orgBId = orgB.id;

  const mkInvite = (orgId: string, expiresAt: Date) =>
    basePrisma.invite.create({
      data: { orgId, token: randomBytes(16).toString("base64url"), role: "MEMBER", expiresAt },
    });
  validA = (await mkInvite(orgAId, new Date(Date.now() + 3_600_000))).token;
  expiredA = (await mkInvite(orgAId, new Date(Date.now() - 3_600_000))).token;
});

after(async () => {
  await basePrisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await basePrisma.$disconnect();
});

test("valid token creates an ACTIVE user linked to the right org, then name is captured", async () => {
  const tel = { userId: randId(), chatId: randId() };
  const joined = await consumeInvite(validA, tel);
  assert.equal(joined.status, "needs_name");

  const user = await basePrisma.user.findFirst({
    where: { orgId: orgAId, telegramUserId: tel.userId },
  });
  assert.ok(user);
  assert.equal(user?.status, "ACTIVE");
  assert.equal(user?.orgId, orgAId);
  assert.equal(user?.name, "");
  assert.equal(user?.telegramChatId, tel.chatId);

  const named = await submitName(tel.userId, "  Abebe  ");
  assert.equal(named.status, "captured");
  assert.equal(named.status === "captured" && named.name, "Abebe");
});

test("invalid token fails with InviteInvalid", async () => {
  await assert.rejects(
    () => consumeInvite("not-a-real-token", { userId: randId(), chatId: randId() }),
    InviteInvalid,
  );
});

test("expired token fails with InviteExpired", async () => {
  await assert.rejects(
    () => consumeInvite(expiredA, { userId: randId(), chatId: randId() }),
    InviteExpired,
  );
});

test("re-tapping after joining is a no-op; name is not re-asked", async () => {
  const tel = { userId: randId(), chatId: randId() };
  await consumeInvite(validA, tel);
  await submitName(tel.userId, "Sara");

  const again = await consumeInvite(validA, tel);
  assert.equal(again.status, "already_joined");
  assert.equal(again.status === "already_joined" && again.name, "Sara");

  const count = await basePrisma.user.count({
    where: { orgId: orgAId, telegramUserId: tel.userId },
  });
  assert.equal(count, 1);
});

test("re-tapping before naming resumes the name ask; still one user", async () => {
  const tel = { userId: randId(), chatId: randId() };
  await consumeInvite(validA, tel);
  const again = await consumeInvite(validA, tel);
  assert.equal(again.status, "needs_name");
  const count = await basePrisma.user.count({
    where: { orgId: orgAId, telegramUserId: tel.userId },
  });
  assert.equal(count, 1);
});

test("concurrent joins with the same identity both succeed and create exactly one user", async () => {
  const tel = { userId: randId(), chatId: randId() };
  const results = await Promise.all([consumeInvite(validA, tel), consumeInvite(validA, tel)]);
  for (const r of results) assert.ok(r.status === "needs_name" || r.status === "already_joined");
  const count = await basePrisma.user.count({
    where: { orgId: orgAId, telegramUserId: tel.userId },
  });
  assert.equal(count, 1);
});

test("concurrent joins with different identities both succeed", async () => {
  const t1 = { userId: randId(), chatId: randId() };
  const t2 = { userId: randId(), chatId: randId() };
  await Promise.all([consumeInvite(validA, t1), consumeInvite(validA, t2)]);
  assert.equal(await basePrisma.user.count({ where: { orgId: orgAId, telegramUserId: t1.userId } }), 1);
  assert.equal(await basePrisma.user.count({ where: { orgId: orgAId, telegramUserId: t2.userId } }), 1);
});

test("a user from org A cannot be linked into org B", async () => {
  const tel = { userId: randId(), chatId: randId() };
  // Pre-existing member with the SAME Telegram id in org B.
  await basePrisma.user.create({
    data: {
      orgId: orgBId,
      name: "B person",
      status: "ACTIVE",
      telegramUserId: tel.userId,
      telegramChatId: tel.chatId,
    },
  });

  await consumeInvite(validA, tel); // uses org A's token

  const inA = await basePrisma.user.findFirst({ where: { orgId: orgAId, telegramUserId: tel.userId } });
  assert.ok(inA);
  assert.equal(inA?.orgId, orgAId); // a separate, A-scoped row

  const inB = await basePrisma.user.findFirst({ where: { orgId: orgBId, telegramUserId: tel.userId } });
  assert.equal(inB?.name, "B person"); // untouched
});

test("submitName for an unknown Telegram id returns unknown", async () => {
  const result = await submitName(randId(), "Nobody");
  assert.equal(result.status, "unknown");
});

test("createOrgInvite is idempotent and MEMBER-scoped; denied for a MEMBER caller", async () => {
  const i1 = await createOrgInvite(ctxFor(orgAId));
  const i2 = await createOrgInvite(ctxFor(orgAId));
  assert.equal(i1.token, i2.token);
  assert.equal(i1.role, "MEMBER");
  assert.ok(i1.expiresAt.getTime() > Date.now());

  await assert.rejects(() => createOrgInvite(ctxFor(orgAId, "MEMBER")), NotAuthorised);
});

test("listMembers is org-scoped", async () => {
  const members = await listMembers(ctxFor(orgAId));
  assert.ok(members.length > 0);
  assert.ok(members.every((m) => m.orgId === orgAId));
});
