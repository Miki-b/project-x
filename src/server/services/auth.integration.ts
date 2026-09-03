import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { basePrisma } from "@/server/db/client";
import { hashPassword } from "@/lib/password";
import { hashSessionToken } from "@/lib/session-token";
import { login, validateSession, invalidateSession } from "@/server/services/auth";
import { NotAuthorised } from "@/types";

/**
 * Auth service integration test (§11). Requires a real database (DATABASE_URL).
 * Run with `npm run test:integration`. Kept permanently.
 */

let orgId: string;
let managerId: string;
const EMAIL = "owner@example.com";
const PASSWORD = "correct horse battery staple";

before(async () => {
  const org = await basePrisma.organization.create({ data: { name: "Auth Test Org" } });
  orgId = org.id;
  const manager = await basePrisma.user.create({
    data: {
      orgId,
      name: "Owner",
      role: "OWNER",
      status: "ACTIVE",
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD),
    },
  });
  managerId = manager.id;
});

after(async () => {
  await basePrisma.organization.deleteMany({ where: { id: orgId } });
  await basePrisma.$disconnect();
});

test("login rejects a wrong password", async () => {
  await assert.rejects(() => login(EMAIL, "wrong"), NotAuthorised);
});

test("login rejects an unknown email", async () => {
  await assert.rejects(() => login("nobody@example.com", PASSWORD), NotAuthorised);
});

test("login succeeds: creates a session, stamps lastLoginAt, stores only the token hash", async () => {
  const { token, session, user } = await login(EMAIL, PASSWORD);
  assert.equal(session.orgId, orgId);
  assert.equal(session.userId, managerId);
  assert.ok(user.lastLoginAt);
  assert.equal(session.id, hashSessionToken(token));
  assert.notEqual(session.id, token); // raw token is never persisted
  await invalidateSession(token);
});

test("validateSession resolves a live token to the right tenant; null after logout", async () => {
  const { token } = await login(EMAIL, PASSWORD);
  const ok = await validateSession(token);
  assert.ok(ok);
  assert.equal(ok?.session.orgId, orgId);
  assert.equal(ok?.user.id, managerId);

  await invalidateSession(token);
  assert.equal(await validateSession(token), null);
});

test("validateSession rejects an unknown token", async () => {
  assert.equal(await validateSession("not-a-real-token"), null);
});

test("expired session is rejected and cleaned up", async () => {
  const { token } = await login(EMAIL, PASSWORD);
  await basePrisma.session.update({
    where: { id: hashSessionToken(token) },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal(await validateSession(token), null);
  assert.equal(
    await basePrisma.session.findUnique({ where: { id: hashSessionToken(token) } }),
    null,
  );
});

test("a DISABLED manager cannot log in", async () => {
  await basePrisma.user.update({ where: { id: managerId }, data: { status: "DISABLED" } });
  await assert.rejects(() => login(EMAIL, PASSWORD), NotAuthorised);
  await basePrisma.user.update({ where: { id: managerId }, data: { status: "ACTIVE" } });
});
