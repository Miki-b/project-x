import type { InlineKeyboard } from "grammy";
import type { Ctx, Locale } from "@/types";
import { basePrisma, orgDb } from "@/server/db/client";
import { taskCardText } from "./messages/task";
import { reasonKeyboard, taskKeyboard } from "./keyboards";

/**
 * Shared bot task helpers for the callback and text handlers.
 *
 * The "waiting for a blocker reason" state is DURABLE: it lives in `users.pendingBlockReason`
 * (the taskId), so it survives restarts and multi-instance webhook mode. The in-memory map
 * below only caches the card's message id for edit-in-place — a cosmetic optimisation that
 * may be lost on restart, which is acceptable (the reason is still captured either way).
 */

type PromptCache = { chatId: number; messageId: number };
const promptCache = new Map<number, PromptCache>();

export function cacheBlockPrompt(telegramUserId: number, prompt: PromptCache): void {
  promptCache.set(telegramUserId, prompt);
}
export function takeBlockPrompt(telegramUserId: number): PromptCache | undefined {
  const prompt = promptCache.get(telegramUserId);
  if (prompt) promptCache.delete(telegramUserId);
  return prompt;
}
export function clearBlockPrompt(telegramUserId: number): void {
  promptCache.delete(telegramUserId);
}

function asLocale(value: string): Locale {
  return value === "am" ? "am" : "en";
}

function memberCtx(user: { orgId: string; id: string; organization: { locale: string } }): Ctx {
  return { orgId: user.orgId, actorId: user.id, role: "MEMBER", locale: asLocale(user.organization.locale) };
}

/** Resolve a Telegram identity to a MEMBER actor Ctx (pre-auth; the bot's tenant entry). */
export async function resolveMemberCtx(telegramUserId: bigint): Promise<Ctx | null> {
  const user = await basePrisma.user.findFirst({
    where: { telegramUserId },
    include: { organization: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return memberCtx(user);
}

/** Mark (durably) that a user owes a blocker reason for a task. */
export async function setPendingBlock(userId: string, taskId: string): Promise<void> {
  await basePrisma.user.update({ where: { id: userId }, data: { pendingBlockReason: taskId } });
}

/** Clear the durable pending-block state. */
export async function clearPendingBlock(userId: string): Promise<void> {
  await basePrisma.user.update({ where: { id: userId }, data: { pendingBlockReason: null } });
}

/**
 * If the user owes a blocker reason, read + clear it and return the actor Ctx, the taskId,
 * and the cached message id (for the card edit). Returns null otherwise.
 */
export async function takePendingBlock(
  telegramUserId: bigint,
): Promise<{ ctx: Ctx; taskId: string; prompt?: PromptCache } | null> {
  const user = await basePrisma.user.findFirst({
    where: { telegramUserId },
    include: { organization: true },
  });
  if (!user || !user.pendingBlockReason) return null;

  const taskId = user.pendingBlockReason;
  await basePrisma.user.update({ where: { id: user.id }, data: { pendingBlockReason: null } });
  return { ctx: memberCtx(user), taskId, prompt: takeBlockPrompt(Number(telegramUserId)) };
}

/** Build the current card (text + keyboard) for a task, or null if it no longer exists. */
export async function renderCard(
  ctx: Ctx,
  taskId: string,
  opts?: { isNew?: boolean; askReason?: boolean; blockedReason?: string | null },
): Promise<{ text: string; keyboard: InlineKeyboard } | null> {
  const task = await orgDb(ctx.orgId).task.findFirst({
    where: { id: taskId },
    include: { createdBy: true },
  });
  if (!task) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  const text = taskCardText({
    title: task.title,
    status: task.status,
    dueAt: task.dueAt,
    fromName: task.createdBy.name || "—",
    locale: ctx.locale,
    completedAt: task.completedAt,
    blockedReason: opts?.blockedReason ?? null,
    isNew: opts?.isNew,
    askReason: opts?.askReason,
  });
  const keyboard = opts?.askReason
    ? reasonKeyboard(task.id, ctx.locale, appUrl)
    : taskKeyboard(task.id, task.status, ctx.locale, appUrl);

  return { text, keyboard };
}
