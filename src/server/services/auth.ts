import type { Session, User } from "@/generated/prisma/client";
// Auth is the PRE-AUTH tenant-entry boundary: no Ctx/orgId exists yet, and email is
// globally unique, so login must resolve an account across orgs. Like the job runner and
// invites.consumeInvite, this is trusted infrastructure and may use basePrisma directly
// (docs/architecture.md §5 rule 2, §11). Every post-login query uses orgDb(session.orgId).
import { basePrisma } from "@/server/db/client";
import { verifyPassword } from "@/lib/password";
import { generateSessionToken, hashSessionToken } from "@/lib/session-token";
import { verifyInitData } from "@/server/auth/telegram-init-data";
import { verifyLoginToken } from "@/lib/login-token";
import { NotAuthorised } from "@/types";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type AuthenticatedSession = { token: string; session: Session; user: User };

/** Mint a session for a user (shared by password login and Mini App auth). */
export async function createSession(
  userId: string,
  orgId: string,
): Promise<{ token: string; session: Session }> {
  const token = generateSessionToken();
  const session = await basePrisma.session.create({
    data: {
      id: hashSessionToken(token),
      orgId,
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { token, session };
}

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

  const { token, session } = await createSession(user.id, user.orgId);
  const updatedUser = await basePrisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { token, session, user: updatedUser };
}

/**
 * Authenticate a Mini App request from Telegram `initData` (docs/architecture.md §11).
 * Verifies the HMAC + freshness, resolves the user by `telegramUserId`, and issues a
 * session. `orgId` always comes from the matched users row — never from `initData`.
 */
export async function authenticateMiniApp(
  initData: string,
): Promise<{ token: string; session: Session; user: User }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  const { telegramUserId } = verifyInitData(initData, token); // throws on tamper / staleness
  const user = await basePrisma.user.findFirst({ where: { telegramUserId } });
  if (!user || user.status !== "ACTIVE") throw new NotAuthorised();

  const created = await createSession(user.id, user.orgId);
  return { token: created.token, session: created.session, user };
}

/**
 * Authenticate an employee from a bot-issued web-login token (docs/architecture.md §11).
 * The bot minted the token for an ACTIVE user it had already identified by Telegram id; we
 * re-check the user is still ACTIVE (and the org matches) before minting a session. Returns
 * null on any invalid/expired/stale token so the caller can bounce back to the login page.
 */
export async function authenticateWebLoginToken(
  token: string,
): Promise<AuthenticatedSession | null> {
  const verified = verifyLoginToken(token);
  if (!verified) return null;

  const user = await basePrisma.user.findFirst({ where: { id: verified.userId } });
  if (!user || user.status !== "ACTIVE" || user.orgId !== verified.orgId) return null;

  const created = await createSession(user.id, user.orgId);
  return { token: created.token, session: created.session, user };
}

/**
 * Resolve a raw cookie token to its session + user (+ the org's locale, so employee surfaces
 * can render in the org's language), or null if missing/expired.
 */
export async function validateSession(
  token: string,
): Promise<{ session: Session; user: User; orgLocale: string } | null> {
  const id = hashSessionToken(token);
  const row = await basePrisma.session.findUnique({
    where: { id },
    include: { user: { include: { organization: true } } },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    await basePrisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  const { user, ...session } = row;
  const { organization, ...userPlain } = user;
  return { session, user: userPlain, orgLocale: organization.locale };
}

/** Delete a session (logout). Idempotent — a missing session is not an error. */
export async function invalidateSession(token: string): Promise<void> {
  await basePrisma.session.delete({ where: { id: hashSessionToken(token) } }).catch(() => {});
}
