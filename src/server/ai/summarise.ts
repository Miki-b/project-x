import type { Ctx } from "@/types";
import type { SummaryInput } from "./schemas";

/**
 * Write a short plain-language end-of-day recap (docs/architecture.md §10, docs/product.md §7).
 * Returns text only; the caller enqueues the Telegram send as a job.
 */
export async function writeDailySummary(_data: SummaryInput, _ctx: Ctx): Promise<string> {
  throw new Error("not implemented");
}
