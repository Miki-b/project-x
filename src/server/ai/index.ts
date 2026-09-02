/**
 * AI module — public surface (docs/architecture.md §3, §10).
 *
 * Everything outside src/server/ai calls the typed functions re-exported here. The AI SDK
 * itself is imported only within `server/ai/**` (the client lives in ./client.ts). Do not
 * import "@anthropic-ai/sdk" anywhere else.
 *
 * Rules the implementations must honour:
 *   - AI never writes to the database. It returns TaskDraft[] for a human to confirm.
 *   - Structured JSON output only, Zod-validated (see schemas.ts).
 *   - Graceful degradation: if the provider is down, core features still work.
 *   - Every call has a timeout and a single retry.
 */

export { aiClient } from "./client";
export { parseTasksFromText, parseTasksFromVoice } from "./parseTasks";
export { transcribeVoice } from "./transcribe";
export { writeDailySummary } from "./summarise";
export { TaskDraftSchema, TaskDraftListSchema } from "./schemas";
export type { TaskDraft, SummaryInput } from "./schemas";
