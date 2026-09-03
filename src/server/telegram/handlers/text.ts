import type { Context } from "grammy";
import { submitName } from "@/server/services/invites";
import { changeStatus } from "@/server/services/tasks";
import { logger } from "@/lib/logger";
import { msg } from "../messages";
import { renderCard, takePendingBlock } from "../task-flow";

/**
 * Plain text from a user. Precedence (docs/bot_flows.md §1):
 *   1. a pending blocker reason (flow c) → record BLOCKED + reason, edit the card
 *   2. name capture (flow a)
 * Commands are handled elsewhere; anything starting with "/" is ignored here.
 */
export async function handleText(ctx: Context): Promise<void> {
  const from = ctx.from;
  const text = ctx.message?.text;
  if (!from || text === undefined || text.startsWith("/")) return;

  const pending = await takePendingBlock(BigInt(from.id));
  if (pending) {
    const { ctx: actor, taskId, prompt } = pending;
    try {
      await changeStatus(actor, taskId, "BLOCKED", text);
      const card = await renderCard(actor, taskId, { blockedReason: text.trim() });
      if (card && prompt) {
        await ctx.api.editMessageText(prompt.chatId, prompt.messageId, card.text, {
          reply_markup: card.keyboard,
        });
      }
      await ctx.reply(msg(actor.locale, "bot.blocked.saved"));
    } catch (error) {
      logger.error("blocker reason failed", {
        orgId: actor.orgId,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(msg(actor.locale, "bot.error.generic"));
    }
    return;
  }

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
