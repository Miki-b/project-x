import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password";

test("verify accepts the correct password", async () => {
  const stored = await hashPassword("correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", stored), true);
});

test("verify rejects a wrong password", async () => {
  const stored = await hashPassword("s3cret");
  assert.equal(await verifyPassword("s3cr3t", stored), false);
});

test("hashes are salted — same password hashes differently each time", async () => {
  assert.notEqual(await hashPassword("same"), await hashPassword("same"));
});

test("verify rejects a malformed stored value", async () => {
  assert.equal(await verifyPassword("x", "garbage"), false);
});
