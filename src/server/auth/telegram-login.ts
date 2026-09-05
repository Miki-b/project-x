import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { InitDataExpired, InitDataInvalid } from "@/types";

/**
 * Verify a Telegram Login Widget callback (https://core.telegram.org/widgets/login#checking-authorization).
 *
 * This is the browser (desktop) sign-in for employees — distinct from the Mini App's
 * `initData` (see telegram-init-data.ts). The crypto differs:
 *   secret_key   = SHA256(bot_token)                    // Mini App uses HMAC(key="WebAppData")
 *   data_check   = every field except `hash`, "key=value", sorted, '\n'-joined
 *   expected     = HMAC_SHA256(key=secret_key, data_check)
 * Compared timing-safe against the supplied `hash`. Rejected if older than `maxAgeSeconds`.
 * Returns only the Telegram user id — orgId is resolved from our DB.
 */

const MAX_AGE_SECONDS = 24 * 60 * 60; // a login is deliberate; allow a day before re-auth

export type VerifiedLogin = { telegramUserId: bigint; authDate: number };

export function verifyTelegramLogin(
  params: Record<string, string | undefined>,
  botToken: string,
  maxAgeSeconds: number = MAX_AGE_SECONDS,
): VerifiedLogin {
  const hash = params.hash;
  if (!hash) throw new InitDataInvalid();

  const dataCheckString = Object.entries(params)
    .filter(([key, value]) => key !== "hash" && value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
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

  const authDate = Number(params.auth_date);
  if (!Number.isFinite(authDate) || authDate <= 0) throw new InitDataInvalid();
  if (Date.now() / 1000 - authDate > maxAgeSeconds) throw new InitDataExpired();

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw new InitDataInvalid();

  return { telegramUserId: BigInt(id), authDate };
}
