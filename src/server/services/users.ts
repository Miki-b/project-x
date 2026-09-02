import type { Role, User, UserStatus } from "@prisma/client";
import type { Ctx } from "@/types";

/**
 * User service (docs/architecture.md §7). Users are disabled, never deleted (§5 rule 7).
 */

export async function getUser(_ctx: Ctx, _userId: string): Promise<User> {
  throw new Error("not implemented");
}

export async function listMembers(_ctx: Ctx): Promise<User[]> {
  throw new Error("not implemented");
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
