import type { Invite, User } from "@prisma/client";
import type { Ctx } from "@/types";

/**
 * Invite service (docs/architecture.md §4.4, §11). One org-wide reusable link is the
 * v1 primary path. Invite tokens are random, expiring, and revocable.
 */

export async function createOrgInvite(_ctx: Ctx): Promise<Invite> {
  throw new Error("not implemented");
}

/**
 * Consume an invite from the bot's `/start <token>` flow. Runs pre-auth (no Ctx):
 * the Telegram identity IS the credential, so this links the user and returns them.
 */
export async function consumeInvite(
  _token: string,
  _telegram: { userId: bigint; chatId: bigint; name?: string },
): Promise<User> {
  throw new Error("not implemented");
}
