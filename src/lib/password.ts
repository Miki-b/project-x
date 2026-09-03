import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing with Node's built-in scrypt (no external dependency).
 * Stored format: `scrypt$<saltHex>$<hashHex>`. Verification is constant-time.
 * Employees never have a password (§11); this is manager-only.
 *
 * Parameters are set explicitly (not left to Node's defaults) at the OWASP-recommended
 * scrypt floor: N=16384 (2^14), r=8, p=1. maxmem is raised so N can be increased later
 * (memory needed ≈ 128 * N * r ≈ 16 MB here). Salt is 16 random bytes; derived key 64 bytes.
 */

const SCRYPT_PARAMS: ScryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

const scryptAsync = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: ScryptOptions,
) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, SCRYPT_PARAMS);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = await scryptAsync(
    password.normalize("NFKC"),
    Buffer.from(saltHex, "hex"),
    expected.length,
    SCRYPT_PARAMS,
  );
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
