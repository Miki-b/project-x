import type { TaskStatus } from "@/generated/prisma/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import { formatInAddis } from "@/lib/time";

/**
 * The task card text (bot flow b/c, docs/bot_flows.md §3). ≤4 short lines so it fits a small
 * screen. `fromName` is who assigned it. Status change edits this same text in place.
 */
export function taskCardText(opts: {
  title: string;
  status: TaskStatus;
  dueAt: Date | null;
  fromName: string;
  locale: Locale;
  completedAt?: Date | null;
  blockedReason?: string | null;
  isNew?: boolean;
  askReason?: boolean;
}): string {
  const { locale } = opts;
  const lines: string[] = [];

  if (opts.isNew) lines.push(t(locale, "task.card.new_badge"));
  lines.push(truncateTitle(opts.title));
  lines.push(
    opts.dueAt
      ? t(locale, "task.card.due", { due: formatInAddis(opts.dueAt, "LLL d · HH:mm") })
      : t(locale, "task.card.no_due"),
  );
  lines.push(t(locale, "task.card.from", { manager: opts.fromName }));

  if (opts.status === "DONE" && opts.completedAt) {
    lines.push(t(locale, "task.card.done_at", { when: formatInAddis(opts.completedAt, "LLL d · HH:mm") }));
  } else {
    lines.push(t(locale, "task.card.status", { status: t(locale, `task.status.${opts.status}`) }));
    if (opts.status === "BLOCKED" && opts.blockedReason) {
      lines.push(t(locale, "task.card.blocked_reason", { reason: opts.blockedReason }));
    }
  }

  if (opts.askReason) lines.push(t(locale, "bot.blocked.ask_reason"));
  return lines.join("\n");
}

/** One line, 40-char cap, cut on a word boundary with … (docs/bot_flows.md §3). */
export function truncateTitle(title: string, cap = 40): string {
  const clean = title.trim();
  if (clean.length <= cap) return clean;
  const slice = clean.slice(0, cap - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s.,;:]+$/, "")}…`;
}
