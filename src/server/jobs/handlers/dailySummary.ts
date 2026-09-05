import { z } from "zod";
import { Api } from "grammy";
import { DateTime } from "luxon";
import { basePrisma } from "@/server/db/client";
import { logger } from "@/lib/logger";
import { t } from "@/lib/i18n";
import type { JobHandler } from "../types";
import type { Locale } from "@/types";

/**
 * DAILY_SUMMARY: the manager's end-of-day recap (docs/bot_flows.md §g, architecture.md §8, §10).
 * Enqueued once per org per local day by the scheduler; delivered to every OWNER/MANAGER who
 * has linked Telegram. No buttons.
 *
 * The AI-written prose recap (§10) is not implemented yet, so this sends the graceful-
 * degradation fallback: header + counts (§10 rule 5). When `writeDailySummary` lands, build the
 * body there and prepend `bot.summary.header`.
 */

const PayloadSchema = z.object({ date: z.string() }); // yyyy-LL-dd in the org's timezone

function asLocale(v: string): Locale {
  return v === "am" ? "am" : "en";
}

export const handleDailySummary: JobHandler = async (db, rawPayload, job) => {
  const { date } = PayloadSchema.parse(rawPayload);

  const org = await basePrisma.organization.findUnique({ where: { id: job.orgId } });
  if (!org) {
    logger.warn("DAILY_SUMMARY: org not found, skipping", { orgId: job.orgId });
    return;
  }
  const locale = asLocale(org.locale);
  const tz = org.timezone || "Africa/Addis_Ababa";

  // Recipients first: if no manager is on Telegram there is nothing to send.
  const managers = await db.user.findMany({
    where: { role: { in: ["OWNER", "MANAGER"] }, status: "ACTIVE", telegramChatId: { not: null } },
  });
  if (managers.length === 0) {
    logger.info("DAILY_SUMMARY: no managers with Telegram, skipping", { orgId: job.orgId });
    return;
  }

  // Local-day window [start, end) expressed in UTC.
  const startLocal = DateTime.fromFormat(date, "yyyy-LL-dd", { zone: tz }).startOf("day");
  const start = startLocal.toUTC().toJSDate();
  const end = startLocal.plus({ days: 1 }).toUTC().toJSDate();
  const dateLabel = startLocal.toFormat("ccc, d LLL"); // e.g. "Mon, 2 Sep"

  const [done, slipped, blocked] = await Promise.all([
    db.task.count({ where: { status: "DONE", completedAt: { gte: start, lt: end } } }),
    db.task.count({
      where: { status: { in: ["PENDING", "IN_PROGRESS", "BLOCKED"] }, dueAt: { lt: new Date() } },
    }),
    db.task.count({ where: { status: "BLOCKED" } }),
  ]);

  const text =
    done === 0 && slipped === 0 && blocked === 0
      ? `${t(locale, "bot.summary.header", { company: org.name, date: dateLabel })}\n${t(locale, "bot.summary.none")}`
      : t(locale, "bot.summary.fallback", {
          company: org.name,
          date: dateLabel,
          done,
          slipped,
          blocked,
        });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const api = new Api(token);

  for (const manager of managers) {
    // telegramChatId is non-null here (filtered above); BigInt → string for grammy.
    await api.sendMessage(manager.telegramChatId!.toString(), text);
  }

  logger.info("DAILY_SUMMARY sent", {
    orgId: job.orgId,
    recipients: managers.length,
    done,
    slipped,
    blocked,
  });
};
