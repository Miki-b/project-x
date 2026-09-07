import type { Role, User, UserStatus } from "@/generated/prisma/client";
import type { Ctx, Locale } from "@/types";
import { NotAuthorised } from "@/types";
import { orgDb } from "@/server/db/client";

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
