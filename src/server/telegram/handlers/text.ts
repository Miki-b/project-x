import type { Context } from "grammy";
import { submitName } from "@/server/services/invites";
import { msg } from "../messages";

/**
 * Plain text from a user (bot flow a name capture, + unknown-user path). Thin.
 * Commands are handled by their own handlers; anything starting with "/" is ignored here.
 * Name is asked exactly once — the service only treats text as a name while one is pending.
 */
export async function handleText(ctx: Context): Promise<void> {
  const from = ctx.from;
  const text = ctx.message?.text;
  if (!from || text === undefined || text.startsWith("/")) return;

  const result = await submitName(BigInt(from.id), text);
  switch (result.status) {
    case "captured":
      await ctx.reply(msg(result.locale, "bot.start.joined", { name: result.name }));
      return;
    case "blank":
      await ctx.reply(msg(result.locale, "bot.start.welcome_ask_name", { company: result.orgName }));
      return;
    case "already_named":
      await ctx.reply(msg(result.locale, "bot.hint.use_buttons"));
      return;
    case "unknown":
      await ctx.reply(msg("en", "bot.error.unknown_user"));
      return;
  }
}
