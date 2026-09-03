import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyInitData } from "./telegram-init-data";
import { InitDataExpired, InitDataInvalid } from "@/types";

const TOKEN = "123456:TEST_BOT_TOKEN";

function build(userId: number, authDate: number, token = TOKEN): string {
  const params = new URLSearchParams();
  params.set("user", JSON.stringify({ id: userId, first_name: "T" }));
  params.set("auth_date", String(authDate));
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", createHmac("sha256", secret).update(dcs).digest("hex"));
  return params.toString();
}

const now = () => Math.floor(Date.now() / 1000);

test("accepts valid initData and returns the Telegram user id", () => {
  const result = verifyInitData(build(42, now()), TOKEN);
  assert.equal(result.telegramUserId, BigInt(42));
});

test("rejects a tampered payload (user id changed after signing)", () => {
  const tampered = build(42, now()).replace("id%22%3A42", "id%22%3A99");
  assert.throws(() => verifyInitData(tampered, TOKEN), InitDataInvalid);
});

test("rejects a signature made with a different bot token", () => {
  const forged = build(42, now(), "999999:WRONG");
  assert.throws(() => verifyInitData(forged, TOKEN), InitDataInvalid);
});

test("rejects a payload older than 5 minutes (replay protection)", () => {
  assert.throws(() => verifyInitData(build(42, now() - 6 * 60), TOKEN), InitDataExpired);
});
