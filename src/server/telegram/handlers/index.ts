import type { Bot } from "grammy";
import { handleStart } from "./start";
import { handleText } from "./text";
import { registerCallbacks } from "./callbacks";

/**
 * Wire commands and callbacks (docs/architecture.md §9). Handlers are thin: parse input,
 * call a service, render a message. No business logic and no direct DB access here.
 *
 * Only the join flow (bot flow a) is implemented so far: `/start <token>` and free-text
 * name capture. The task commands (/today, /mytasks, /language, /help) and task callbacks
 * are registered as they are implemented. `message:text` is registered AFTER commands so a
 * command is never mis-read as a name.
 */
export function registerHandlers(bot: Bot): void {
  bot.command("start", handleStart);
  registerCallbacks(bot);
  bot.on("message:text", handleText);
}
