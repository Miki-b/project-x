import type { Ctx } from "@/types";

/**
 * Transcribe a Telegram-hosted voice note to text (docs/architecture.md §10).
 * Voice notes over a set length must be rejected with a helpful message (§10 rule 6).
 */
export async function transcribeVoice(_fileId: string, _ctx: Ctx): Promise<string> {
  throw new Error("not implemented");
}
