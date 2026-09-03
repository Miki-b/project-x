import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { basePrisma } from "@/server/db/client";
import { authenticateMiniApp } from "@/server/services/auth";

/**
 * Mini App auth integration test (docs/architecture.md §11). Requires a database.
 * Proves the session's orgId comes from the matched users row, never from initData.
 */

const TOKEN = "test-bot-token-abc";
let orgId: string;
let userId: string;
const telegramId = 770000 + Math.floor(Math.random() * 100000);

function buildInitData(userIdNum: number, authDate: number, extra: Record<string, string>): string {
  const params = new URLSearchParams();
  params.set("user", JSON.stringify({ id: userIdNum, first_name: "T" }));
  params.set("auth_date", String(authDate));
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = createHmac("sha256", "WebAppData").update(TOKEN).digest();
  params.set("hash", createHmac("sha256", secret).update(dcs).digest("hex"));
  return params.toString();
}

before(async () => {
  process.env.TELEGRAM_BOT_TOKEN = TOKEN;
  const org = await basePrisma.organization.create({ data: { name: "MiniApp Auth Org" } });
  orgId = org.id;
  const user = await basePrisma.user.create({
    data: { orgId, name: "Field worker", status: "ACTIVE", telegramUserId: BigInt(telegramId) },
  });
  userId = user.id;
});

after(async () => {
  await basePrisma.organization.deleteMany({ where: { id: orgId } });
  await basePrisma.$disconnect();
});

test("session orgId comes from the users row, not from initData", async () => {
  // initData carries a bogus org hint that must be ignored.
  const initData = buildInitData(telegramId, Math.floor(Date.now() / 1000), {
    start_param: "org-attacker",
    chat_instance: "org-attacker",
  });

  const { session, user } = await authenticateMiniApp(initData);
  assert.equal(session.orgId, orgId);
  assert.equal(user.id, userId);
  assert.notEqual(session.orgId, "org-attacker");
});
