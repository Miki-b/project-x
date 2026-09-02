/**
 * Anthropic client construction.
 *
 * RULE: only `server/ai/**` imports the AI SDK (docs/architecture.md §3, §10). Nothing
 * outside src/server/ai may import "@anthropic-ai/sdk" — feature code calls the typed
 * functions re-exported from ./index.ts instead. This file is internal to the module.
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
