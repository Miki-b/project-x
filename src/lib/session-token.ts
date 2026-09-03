import { createHash, randomBytes } from "node:crypto";

/**
 * Session tokens (§11). The raw token goes in the cookie; only its SHA-256 hash is
 * stored (as Session.id), so a database leak never exposes a live session token.
 */

/** High-entropy opaque token (~192 bits), URL-safe for a cookie value. */
export function generateSessionToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Deterministic hash of a token — this is what we persist and look up by. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
