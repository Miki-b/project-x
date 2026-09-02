import { InlineKeyboard } from "grammy";
import type { Locale } from "@/types";

/**
 * Inline keyboard shown on a task message: Started · Done · Blocked (docs/architecture.md §9).
 * Callback data carries the taskId and target status; button labels come from i18n.
 */
export function taskKeyboard(_taskId: string, _locale: Locale): InlineKeyboard {
  throw new Error("not implemented");
}
