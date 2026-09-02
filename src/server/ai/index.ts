/**
 * AI module boundary (docs/architecture.md §3, §10).
 *
 * This is the ONLY file in the codebase permitted to import the AI SDK. Everything
 * else calls the typed functions re-exported below. Do not import "@anthropic-ai/sdk"
 * anywhere outside src/server/ai.
 *
 * Rules the implementations must honour:
 *   - AI never writes to the database. It returns TaskDraft[] for a human to confirm.
 *   - Structured JSON output only, Zod-validated (see schemas.ts).
 *   - Graceful degradation: if the provider is down, core features still work.
 *   - Every call has a timeout and a single retry.
 */
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

/** Lazily construct the Anthropic client. Internal to src/server/ai. */
export function aiClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export { parseTasksFromText, parseTasksFromVoice } from "./parseTasks";
export { transcribeVoice } from "./transcribe";
export { writeDailySummary } from "./summarise";
export { TaskDraftSchema, TaskDraftListSchema } from "./schemas";
export type { TaskDraft, SummaryInput } from "./schemas";
