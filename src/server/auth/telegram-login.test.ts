import test from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { verifyTelegramLogin } from "./telegram-login";
import { InitDataExpired, InitDataInvalid } from "@/types";

const TOKEN = "123456:TEST_BOT_TOKEN";

/** Build a correctly-signed Login Widget param set (secret = SHA256(token)). */
function build(id: number, authDate: number, token = TOKEN): Record<string, string> {
  const params: Record<string, string> = {
    id: String(id),
    first_name: "T",
    username: "tester",
    auth_date: String(authDate),
  };
  const dcs = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  params.hash = createHmac("sha256", secret).update(dcs).digest("hex");
  return params;
}

const now = () => Math.floor(Date.now() / 1000);

test("accepts a valid Login Widget payload and returns the Telegram user id", () => {
  const result = verifyTelegramLogin(build(42, now()), TOKEN);
  assert.equal(result.telegramUserId, BigInt(42));
});

test("rejects a tampered payload (id changed after signing)", () => {
  const p = build(42, now());
  p.id = "99";
  assert.throws(() => verifyTelegramLogin(p, TOKEN), InitDataInvalid);
});

test("rejects a signature made with a different bot token", () => {
  assert.throws(() => verifyTelegramLogin(build(42, now(), "999999:WRONG"), TOKEN), InitDataInvalid);
});

test("rejects a payload older than the max age (replay protection)", () => {
  assert.throws(() => verifyTelegramLogin(build(42, now() - 25 * 60 * 60), TOKEN), InitDataExpired);
});
