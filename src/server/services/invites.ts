import { randomBytes } from "node:crypto";
import type { Invite } from "@/generated/prisma/client";
import { Prisma, Role } from "@/generated/prisma/client";
import type { Ctx, Locale } from "@/types";
import { InviteExpired, InviteInvalid, NotAuthorised } from "@/types";
import { basePrisma, orgDb } from "@/server/db/client";

/**
 * Invite + join (onboarding) service (docs/architecture.md §4.4, §9, §11; bot flow a).
 *
 * `createOrgInvite` is manager-side and org-scoped (orgDb). `consumeInvite` and
 * `submitName` are the PRE-AUTH tenant-entry boundary — a Telegram user has no session or
 * orgId yet, so they resolve identity across orgs via basePrisma (like auth.login). Every
 * post-join, org-scoped operation goes through orgDb.
 */

const INVITE_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000; // org-wide reusable link: effectively non-expiring

function asLocale(value: string): Locale {
  return value === "am" ? "am" : "en";
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** The org-wide reusable invite link. Idempotent: returns the existing live link or makes one. */
export async function createOrgInvite(ctx: Ctx): Promise<Invite> {
  if (ctx.role === "MEMBER") throw new NotAuthorised();
  const db = orgDb(ctx.orgId);

  const existing = await db.invite.findFirst({
    where: { usedById: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return db.invite.create({
    // orgId is also injected by the orgDb extension; we pass it so the create input
    // type-checks (the extension overwrites it with ctx.orgId regardless).
    data: {
      orgId: ctx.orgId,
      token: randomBytes(16).toString("base64url"), // URL-safe, ~22 chars, valid Telegram start param
      role: Role.MEMBER,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
}

export type JoinOutcome =
  | { status: "needs_name"; orgName: string; locale: Locale }
  | { status: "already_joined"; name: string; locale: Locale };

/**
 * Consume an invite from `/start <token>`. Idempotent and race-safe: the same person
 * tapping twice never creates a second user, and two people tapping at once both join
 * cleanly (the loser of the unique-constraint race re-reads the winner's row).
 */
export async function consumeInvite(
  token: string,
  telegram: { userId: bigint; chatId: bigint },
): Promise<JoinOutcome> {
  const invite = await basePrisma.invite.findUnique({
    where: { token },
    include: { organization: true },
  });
  if (!invite) throw new InviteInvalid();
  if (invite.expiresAt.getTime() <= Date.now()) throw new InviteExpired();

  const orgId = invite.orgId;
  const orgName = invite.organization.name;
  const locale = asLocale(invite.organization.locale);

  const outcomeFor = (user: { name: string }): JoinOutcome =>
    user.name.trim() === ""
      ? { status: "needs_name", orgName, locale }
      : { status: "already_joined", name: user.name, locale };

  const existing = await basePrisma.user.findFirst({
    where: { orgId, telegramUserId: telegram.userId },
  });
  if (existing) {
    if (existing.telegramChatId !== telegram.chatId) {
      await basePrisma.user.update({
        where: { id: existing.id },
        data: { telegramChatId: telegram.chatId },
      });
    }
    return outcomeFor(existing);
  }

  try {
    const created = await basePrisma.user.create({
      data: {
        orgId,
        name: "",
        role: invite.role,
        status: "ACTIVE",
        telegramUserId: telegram.userId,
        telegramChatId: telegram.chatId,
        telegramLinkedAt: new Date(),
      },
    });
    return outcomeFor(created);
  } catch (error) {
    // Lost the race: another concurrent /start created this user first. Re-read and proceed.
    if (isUniqueViolation(error)) {
      const winner = await basePrisma.user.findFirst({
        where: { orgId, telegramUserId: telegram.userId },
      });
      if (winner) return outcomeFor(winner);
    }
    throw error;
  }
}

export type NameOutcome =
  | { status: "captured"; name: string; locale: Locale }
  | { status: "blank"; orgName: string; locale: Locale }
  | { status: "already_named"; locale: Locale }
  | { status: "unknown" };

/**
 * Capture the name for a Telegram user who has joined but not yet named themselves.
 * Asked exactly once: once `name` is set, further text is not treated as a name.
 */
export async function submitName(telegramUserId: bigint, rawName: string): Promise<NameOutcome> {
  const user = await basePrisma.user.findFirst({
    where: { telegramUserId },
    include: { organization: true },
  });
  if (!user) return { status: "unknown" };

  const locale = asLocale(user.organization.locale);
  if (user.name.trim() !== "") return { status: "already_named", locale };

  const name = rawName.trim().slice(0, 100);
  if (name === "") return { status: "blank", orgName: user.organization.name, locale };

  const updated = await basePrisma.user.update({ where: { id: user.id }, data: { name } });
  return { status: "captured", name: updated.name, locale };
}
