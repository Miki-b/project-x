import type { Bot } from "grammy";
import { handleStart } from "./start";
import { handleToday } from "./today";
import { handleMyTasks } from "./mytasks";
import { handleLanguage } from "./language";
import { handleHelp } from "./help";
import { registerCallbacks } from "./callbacks";

/**
 * Wire commands and callbacks (docs/architecture.md §9). Handlers are thin: parse input,
 * call a service, render a message. No business logic and no direct DB access here.
 */
export function registerHandlers(bot: Bot): void {
  bot.command("start", handleStart);
  bot.command("today", handleToday);
  bot.command("mytasks", handleMyTasks);
  bot.command("language", handleLanguage);
  bot.command("help", handleHelp);
  registerCallbacks(bot);
}
