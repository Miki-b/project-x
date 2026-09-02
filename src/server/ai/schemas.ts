import { z } from "zod";

/**
 * Zod schemas for AI output (docs/architecture.md §10 rule 2). AI responses are
 * JSON-only and schema-validated before use; a validation failure is a clean error.
 */

/**
 * A single task draft returned by the model. The model returns an assignee NAME
 * (a string) — our code resolves it to an org member (§10 rule 3). The model never
 * sees or invents user IDs. `dueAt` is an ISO 8601 string resolved in the org
 * timezone (§10 rule 4).
 */
export const TaskDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeName: z.string().optional(),
  dueAt: z.string().optional(),
});

export type TaskDraft = z.infer<typeof TaskDraftSchema>;

export const TaskDraftListSchema = z.array(TaskDraftSchema);

/** Input to `writeDailySummary` — assembled by the summaries service, not the model. */
export type SummaryInput = {
  date: string; // ISO date in the org timezone
  done: { title: string; assignee: string }[];
  slipped: { title: string; assignee: string; dueAt: string }[];
  blocked: { title: string; assignee: string; reason?: string }[];
};
