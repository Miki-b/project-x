import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing with Node's built-in scrypt (no external dependency).
 * Stored format: `scrypt$<saltHex>$<hashHex>`. Verification is constant-time.
 * Employees never have a password (§11); this is manager-only.
 */

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;
const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(password.normalize("NFKC"), salt, KEYLEN)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
