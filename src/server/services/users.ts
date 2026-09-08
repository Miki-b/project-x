import { del } from "@vercel/blob";
import type { Role, User, UserStatus } from "@/generated/prisma/client";
import type { Ctx, Locale } from "@/types";
import { NotAuthorised } from "@/types";
import { orgDb } from "@/server/db/client";

// Accept any Vercel Blob host (private stores serve from `<id>.private.blob.…`).
const BLOB_URL_RE = /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//;

/**
 * User service (docs/architecture.md §7). Users are disabled, never deleted (§5 rule 7).
 */

export async function getUser(_ctx: Ctx, _userId: string): Promise<User> {
  throw new Error("not implemented");
}

/** The team list for the dashboard. Manager-only; org-scoped. Active first, then by name. */
export async function listMembers(ctx: Ctx): Promise<User[]> {
  if (ctx.role === "MEMBER") throw new NotAuthorised();
  return orgDb(ctx.orgId).user.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] });
}

/**
 * Set the actor's own preferred language. Any authenticated user may change their own; the
 * choice drives every surface they touch (dashboard/portal, Mini App, and their bot messages).
 */
export async function setOwnLocale(ctx: Ctx, locale: Locale): Promise<void> {
  await orgDb(ctx.orgId).user.update({ where: { id: ctx.actorId }, data: { locale } });
}

// --- Profile (self-service) ---------------------------------------------------------------

/** The current user's own row (name, phone, avatar, …), or null if it has vanished. */
export async function getMe(ctx: Ctx): Promise<User | null> {
  return orgDb(ctx.orgId).user.findFirst({ where: { id: ctx.actorId } });
}

/** Update the actor's own display name and phone. Name is required; phone is optional. */
export async function updateProfile(
  ctx: Ctx,
  input: { name: string; phone?: string },
): Promise<void> {
  const name = input.name.trim().slice(0, 100);
  if (name === "") throw new NotAuthorised("Name is required");
  const phone = input.phone?.trim().slice(0, 40) || null;
  await orgDb(ctx.orgId).user.update({ where: { id: ctx.actorId }, data: { name, phone } });
}

/** Set the actor's own avatar after a blob upload; deletes the previous avatar object. */
export async function setOwnAvatar(
  ctx: Ctx,
  avatar: { url: string; pathname: string },
): Promise<void> {
  if (!BLOB_URL_RE.test(avatar.url)) throw new NotAuthorised("Invalid avatar URL");
  const db = orgDb(ctx.orgId);
  const me = await db.user.findFirst({ where: { id: ctx.actorId } });
  await db.user.update({
    where: { id: ctx.actorId },
    data: { avatarUrl: avatar.url, avatarPathname: avatar.pathname },
  });
  if (me?.avatarUrl && me.avatarUrl !== avatar.url) {
    try {
      await del(me.avatarUrl);
    } catch {
      /* ignore blob errors */
    }
  }
}

/** Remove the actor's avatar (falls back to initials). Best-effort object delete. */
export async function removeOwnAvatar(ctx: Ctx): Promise<void> {
  const db = orgDb(ctx.orgId);
  const me = await db.user.findFirst({ where: { id: ctx.actorId } });
  await db.user.update({
    where: { id: ctx.actorId },
    data: { avatarUrl: null, avatarPathname: null },
  });
  if (me?.avatarUrl) {
    try {
      await del(me.avatarUrl);
    } catch {
      /* ignore blob errors */
    }
  }
}

/** Resolve the Telegram identity to a single org member (docs/architecture.md §4.3). */
export async function resolveByTelegramUserId(
  _ctx: Ctx,
  _telegramUserId: bigint,
): Promise<User | null> {
  throw new Error("not implemented");
}

export async function setRole(_ctx: Ctx, _userId: string, _role: Role): Promise<User> {
  throw new Error("not implemented");
}

export async function setStatus(_ctx: Ctx, _userId: string, _status: UserStatus): Promise<User> {
  throw new Error("not implemented");
}
