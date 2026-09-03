import type { Context } from "grammy";
import { consumeInvite } from "@/server/services/invites";
import { InviteExpired, InviteInvalid } from "@/types";
import { msg } from "../messages";

/**
 * `/start <invite_token>` (docs/architecture.md §9, bot flow a). Thin: parse the token,
 * call the service, render. All copy comes from i18n keys.
 */
export async function handleStart(ctx: Context): Promise<void> {
  const from = ctx.from;
  const chat = ctx.chat;
  if (!from || !chat) return;

  const token = (typeof ctx.match === "string" ? ctx.match : "").trim();
  if (token === "") {
    await ctx.reply(msg("en", "bot.error.no_token"));
    return;
  }

  try {
    const result = await consumeInvite(token, {
      userId: BigInt(from.id),
      chatId: BigInt(chat.id),
    });
    if (result.status === "needs_name") {
      await ctx.reply(msg(result.locale, "bot.start.welcome_ask_name", { company: result.orgName }));
    } else {
      await ctx.reply(msg(result.locale, "bot.start.already_joined", { name: result.name }));
    }
  } catch (error) {
    if (error instanceof InviteExpired) {
      await ctx.reply(msg("en", "bot.error.invite_expired"));
      return;
    }
    if (error instanceof InviteInvalid) {
      await ctx.reply(msg("en", "bot.error.invite_invalid"));
      return;
    }
    throw error;
  }
}
