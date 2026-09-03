import type { Session, User } from "@/generated/prisma/client";
// Auth is the PRE-AUTH tenant-entry boundary: no Ctx/orgId exists yet, and email is
// globally unique, so login must resolve an account across orgs. Like the job runner and
// invites.consumeInvite, this is trusted infrastructure and may use basePrisma directly
// (docs/architecture.md §5 rule 2, §11). Every post-login query uses orgDb(session.orgId).
import { basePrisma } from "@/server/db/client";
import { verifyPassword } from "@/lib/password";
import { generateSessionToken, hashSessionToken } from "@/lib/session-token";
import { NotAuthorised } from "@/types";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type AuthenticatedSession = { token: string; session: Session; user: User };

/**
 * Authenticate a manager by email + password. On success creates a session and stamps
 * lastLoginAt; on any failure throws NotAuthorised with a generic message (no oracle for
 * whether the email exists). Only ACTIVE users with a password can log in.
 */
export async function login(email: string, password: string): Promise<AuthenticatedSession> {
  const user = await basePrisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.passwordHash || user.status !== "ACTIVE") {
    throw new NotAuthorised("Invalid email or password");
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new NotAuthorised("Invalid email or password");

  const token = generateSessionToken();
  const now = new Date();
  const session = await basePrisma.session.create({
    data: {
      id: hashSessionToken(token),
      orgId: user.orgId,
      userId: user.id,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    },
  });
  const updatedUser = await basePrisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: now },
  });

  return { token, session, user: updatedUser };
}

/** Resolve a raw cookie token to its session + user, or null if missing/expired. */
export async function validateSession(
  token: string,
): Promise<{ session: Session; user: User } | null> {
  const id = hashSessionToken(token);
  const row = await basePrisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    await basePrisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  const { user, ...session } = row;
  return { session, user };
}

/** Delete a session (logout). Idempotent — a missing session is not an error. */
export async function invalidateSession(token: string): Promise<void> {
  await basePrisma.session.delete({ where: { id: hashSessionToken(token) } }).catch(() => {});
}
