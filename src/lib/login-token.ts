import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived signed token for the "log in via the bot" flow (docs/architecture.md §11).
 *
 * The bot (which knows the Telegram user) mints one of these and sends the employee a button
 * linking to /app/auth?t=<token>. The web route verifies the signature + expiry and issues a
 * real session. Self-contained (no DB row): it carries the userId + orgId, signed with a key
 * derived from the bot token, and expires in minutes so a leaked link is quickly useless.
 */

const TTL_SECONDS = 5 * 60;

function signingKey(): Buffer {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return createHmac("sha256", "weblogin").update(token).digest();
}

export function createLoginToken(userId: string, orgId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, o: orgId, e: Math.floor(Date.now() / 1000) + TTL_SECONDS }),
  ).toString("base64url");
  const sig = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyLoginToken(token: string): { userId: string; orgId: string } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let data: { u?: string; o?: string; e?: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!data.u || !data.o || typeof data.e !== "number") return null;
  if (Date.now() / 1000 > data.e) return null;
  return { userId: data.u, orgId: data.o };
}
