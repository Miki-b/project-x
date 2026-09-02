import type { Bot } from "grammy";

/**
 * Task inline-button callbacks — Started / Done / Blocked (docs/architecture.md §9).
 * Every callback MUST be verified against the acting user's org before doing anything
 * (a crafted taskId from another org must fail) and MUST be idempotent (Telegram redelivers).
 * Tapping Blocked puts the user into a short reply state asking for a reason.
 */
export function registerCallbacks(_bot: Bot): void {
  // TODO: bot.callbackQuery(/^task:(started|done|blocked):(.+)$/, ...)
}
