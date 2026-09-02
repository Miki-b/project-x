import type { Ctx } from "@/types";
import type { TaskDraft } from "./schemas";

/**
 * Parse structured task drafts from free text (docs/architecture.md §10).
 * Must return schema-validated drafts (TaskDraftListSchema). AI never writes to the DB.
 */
export async function parseTasksFromText(_input: string, _ctx: Ctx): Promise<TaskDraft[]> {
  throw new Error("not implemented");
}

/** Transcribe + parse a Telegram voice note into task drafts (docs/architecture.md §10). */
export async function parseTasksFromVoice(_fileId: string, _ctx: Ctx): Promise<TaskDraft[]> {
  throw new Error("not implemented");
}
