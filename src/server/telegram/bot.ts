import { Bot } from "grammy";
import { logger } from "@/lib/logger";
import { registerHandlers } from "./handlers";

/**
 * grammY bot instance (docs/architecture.md §9). Constructed lazily so importing this
 * module (e.g. from the webhook route) does not require a token at build time. Both the
 * webhook (prod) and long-polling (dev) entry points call `getBot()`.
 */

let bot: Bot | undefined;

export function getBot(): Bot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
    bot = new Bot(token);
    registerHandlers(bot);
    bot.catch((err) => {
      logger.error("bot handler error", { error: err.message });
    });
  }
  return bot;
}
