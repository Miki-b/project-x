import { Context, InlineKeyboard } from "grammy";
import { consumeInvite } from "@/server/services/invites";
import { resolveMemberCtx } from "../task-flow";
import { createLoginToken } from "@/lib/login-token";
import { InviteExpired, InviteInvalid } from "@/types";
import { msg } from "../messages";

/**
 * `/start <param>` (docs/architecture.md §9, bot flow a). Two params:
 *   - `weblogin` — issue a one-tap link into the employee web app (§11).
 *   - otherwise  — treat as an invite token: consume it and render onboarding.
 * Thin: parse, call the service, render. All copy comes from i18n keys.
 */
export async function handleStart(ctx: Context): Promise<void> {
  const from = ctx.from;
  const chat = ctx.chat;
  if (!from || !chat) return;

  const token = (typeof ctx.match === "string" ? ctx.match : "").trim();

  if (token === "weblogin") {
    await handleWebLogin(ctx, from.id);
    return;
  }

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

/**
 * `/start weblogin`: the employee tapped "Continue with Telegram" on the web app. If we know
 * them (ACTIVE member), send a one-tap button that signs them in on the browser; otherwise
 * tell them to join via their invite link first.
 */
async function handleWebLogin(ctx: Context, telegramUserId: number): Promise<void> {
  const member = await resolveMemberCtx(BigInt(telegramUserId));
  if (!member) {
    await ctx.reply(msg("en", "bot.error.unknown_user"));
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  const loginToken = createLoginToken(member.actorId, member.orgId);
  const keyboard = new InlineKeyboard().url(
    msg(member.locale, "bot.button.open_tasks"),
    `${appUrl}/app/auth?t=${loginToken}`,
  );
  await ctx.reply(msg(member.locale, "bot.weblogin.prompt"), { reply_markup: keyboard });
}
