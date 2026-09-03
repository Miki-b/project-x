import type { Bot, Context } from "grammy";
import { changeStatus } from "@/server/services/tasks";
import { InvalidTransition, NotAuthorised, TaskNotFound } from "@/types";
import type { Ctx } from "@/types";
import { logger } from "@/lib/logger";
import { msg } from "../messages";
import {
  cacheBlockPrompt,
  clearBlockPrompt,
  clearPendingBlock,
  renderCard,
  resolveMemberCtx,
  setPendingBlock,
} from "../task-flow";

/**
 * Task inline-button callbacks — Started / I'm done / I'm stuck (docs/bot_flows.md flow b/c).
 * Every callback is verified against the acting user's org (via the MEMBER Ctx + orgDb
 * scoping in the service) and is idempotent: a stale/duplicate tap re-renders the same
 * state. Status change EDITS the existing message, never sends a new one.
 */
export function registerCallbacks(bot: Bot): void {
  bot.callbackQuery(/^t:(start|done|block|cancelblock):(.+)$/, async (ctx) => {
    const action = ctx.match[1];
    const taskId = ctx.match[2];
    const from = ctx.from;
    if (!from) {
      await ctx.answerCallbackQuery();
      return;
    }

    const actor = await resolveMemberCtx(BigInt(from.id));
    if (!actor) {
      await ctx.answerCallbackQuery({ text: msg("en", "bot.error.unknown_user") });
      return;
    }

    try {
      if (action === "start" || action === "done") {
        await changeStatus(actor, taskId, action === "start" ? "IN_PROGRESS" : "DONE");
        await editToCurrent(ctx, actor, taskId);
        await ctx.answerCallbackQuery({
          text: msg(actor.locale, action === "start" ? "bot.toast.started" : "bot.toast.done"),
        });
      } else if (action === "block") {
        // Don't change status yet — collect a reason first (flow c). Durable state in the DB;
        // the message id is cached for the in-place edit.
        await setPendingBlock(actor.actorId, taskId);
        cacheBlockPrompt(from.id, {
          chatId: ctx.chat?.id ?? from.id,
          messageId: ctx.callbackQuery.message?.message_id ?? 0,
        });
        const card = await renderCard(actor, taskId, { askReason: true });
        if (card) await ctx.editMessageText(card.text, { reply_markup: card.keyboard });
        await ctx.answerCallbackQuery({ text: msg(actor.locale, "bot.toast.blocked") });
      } else {
        await clearPendingBlock(actor.actorId);
        clearBlockPrompt(from.id);
        await editToCurrent(ctx, actor, taskId);
        await ctx.answerCallbackQuery({ text: msg(actor.locale, "bot.toast.cancelled") });
      }
    } catch (error) {
      if (error instanceof TaskNotFound || error instanceof NotAuthorised) {
        await ctx.answerCallbackQuery({
          text: msg(actor.locale, "bot.error.task_unavailable"),
          show_alert: true,
        });
        await ctx.editMessageReplyMarkup().catch(() => {});
        return;
      }
      if (error instanceof InvalidTransition) {
        // Idempotent / not-allowed tap: re-render current state, no change.
        await editToCurrent(ctx, actor, taskId);
        await ctx.answerCallbackQuery();
        return;
      }
      logger.error("callback failed", {
        orgId: actor.orgId,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.answerCallbackQuery({ text: msg(actor.locale, "bot.error.generic") });
    }
  });
}

async function editToCurrent(ctx: Context, actor: Ctx, taskId: string): Promise<void> {
  const card = await renderCard(actor, taskId);
  if (!card) return;
  // "message is not modified" (identical re-render) is benign.
  await ctx.editMessageText(card.text, { reply_markup: card.keyboard }).catch(() => {});
}
