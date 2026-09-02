import "dotenv/config";
import { startRunner } from "../src/server/jobs/runner";
import { logger } from "../src/lib/logger";

/**
 * Worker process entry (docs/architecture.md §13): runs the job-runner poll loop.
 * The Telegram bot runs in webhook mode inside the Next.js `web` process in production,
 * and via `npm run bot:dev` (long polling) in development.
 */
startRunner().catch((err) => {
  logger.error("worker crashed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
