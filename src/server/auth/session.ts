import { cookies } from "next/headers";
import type { Ctx } from "@/types";
import { validateSession, invalidateSession } from "@/server/services/auth";

/**
 * Web session adapter (§11). Bridges the httpOnly cookie (transport) to the transport-free
 * auth service. This is the ONLY place the session cookie is read/written, and the only
 * source of `orgId` for the dashboard — never trust orgId from a request body or param.
 *
 * Lives outside `server/services` on purpose: it imports `next/headers`, so it is a web
 * adapter, not core logic. Services stay free of transport concerns (§7).
 */

const COOKIE_NAME = "session";

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Log out: invalidate the current session (if any) and clear the cookie. */
export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await invalidateSession(token);
  store.delete(COOKIE_NAME);
}

/**
 * Build the actor `Ctx` for the current request from the session cookie, or null if the
 * caller is unauthenticated. `orgId` comes from the session only (§11).
 */
export async function getCurrentCtx(): Promise<Ctx | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const result = await validateSession(token);
  if (!result) return null;

  return {
    orgId: result.session.orgId,
    actorId: result.user.id,
    role: result.user.role,
    // Dashboard is English in v1 (Amharic dashboard is post-v1, docs/product.md §13).
    locale: "en",
  };
}

/**
 * Build the actor `Ctx` for a Mini App request. Same session cookie as the dashboard, but
 * the role is **always MEMBER** (docs/architecture.md §11) — the employee surface can only
 * act on the actor's own tasks, regardless of the user's actual role. `orgId` comes from
 * the session (the users row), never from initData.
 */
export async function getMiniAppCtx(): Promise<Ctx | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const result = await validateSession(token);
  if (!result) return null;

  return {
    orgId: result.session.orgId,
    actorId: result.user.id,
    role: "MEMBER",
    locale: "en",
  };
}
