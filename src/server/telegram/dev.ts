import "dotenv/config";
import { getBot } from "./bot";
import { logger } from "@/lib/logger";

/**
 * Development entry: run the bot with long polling (docs/architecture.md §9 — webhook in
 * production, long polling only in local development). Started via `npm run bot:dev`.
 */
async function main(): Promise<void> {
  const bot = getBot();
  logger.info("bot starting (long polling)");
  await bot.start({
    onStart: (info) => logger.info("bot started", { username: info.username }),
  });
}

main().catch((err) => {
  logger.error("bot crashed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
