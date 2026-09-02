import type { Context } from "grammy";

/** `/start <invite_token>`: consume the invite, link telegramUserId, ask for a name once. */
export async function handleStart(_ctx: Context): Promise<void> {
  throw new Error("not implemented");
}
