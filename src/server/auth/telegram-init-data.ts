import { createHmac, timingSafeEqual } from "node:crypto";
import { InitDataExpired, InitDataInvalid } from "@/types";

/**
 * Verify Telegram Mini App `initData` (docs/architecture.md §11).
 *
 * Algorithm (Telegram spec):
 *   data_check_string = every field except `hash`, as `key=value`, sorted by key, '\n'-joined
 *   secret_key        = HMAC_SHA256(key="WebAppData", message=<bot_token>)
 *   expected_hash     = HMAC_SHA256(key=secret_key, message=data_check_string)
 * Compared timing-safe against the supplied `hash`. Rejected if older than `maxAgeSeconds`
 * (replay protection). Returns only the Telegram user id — orgId is resolved from our DB.
 */

const MAX_AGE_SECONDS = 5 * 60;

export type VerifiedInitData = { telegramUserId: bigint; authDate: number };

export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number = MAX_AGE_SECONDS,
): VerifiedInitData {
  const params = new URLSearchParams(initData);

  const hash = params.get("hash");
  if (!hash) throw new InitDataInvalid();
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(hash, "hex");
  } catch {
    throw new InitDataInvalid();
  }
  if (provided.length !== expected.length || !timingSafeEqual(expected, provided)) {
    throw new InitDataInvalid();
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || authDate <= 0) throw new InitDataInvalid();
  if (Date.now() / 1000 - authDate > maxAgeSeconds) throw new InitDataExpired();

  const userRaw = params.get("user");
  if (!userRaw) throw new InitDataInvalid();
  let userId: unknown;
  try {
    userId = (JSON.parse(userRaw) as { id?: unknown }).id;
  } catch {
    throw new InitDataInvalid();
  }
  if (typeof userId !== "number" || !Number.isInteger(userId)) throw new InitDataInvalid();

  return { telegramUserId: BigInt(userId), authDate };
}
