import test from "node:test";
import assert from "node:assert/strict";
import { generateSessionToken, hashSessionToken } from "./session-token";

test("hashSessionToken is deterministic", () => {
  assert.equal(hashSessionToken("abc"), hashSessionToken("abc"));
});

test("different tokens hash differently", () => {
  assert.notEqual(hashSessionToken("abc"), hashSessionToken("abd"));
});

test("generateSessionToken returns distinct, high-entropy tokens", () => {
  const a = generateSessionToken();
  const b = generateSessionToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 24);
});
