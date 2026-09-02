import type { Ctx } from "@/types";

/**
 * Summary service (docs/architecture.md §7, §10). Gathers the day's task data, calls
 * `ai.writeDailySummary`, and returns text. The Telegram send is enqueued as a job,
 * never sent inline. If AI is down, this must degrade gracefully.
 */

export async function generateDailySummary(_ctx: Ctx, _date: Date): Promise<string> {
  throw new Error("not implemented");
}
