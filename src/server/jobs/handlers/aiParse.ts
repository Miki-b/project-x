import type { JobHandler } from "../types";

/** AI_PARSE: transcribe + parse a voice note, then reply with a draft (docs/architecture.md §8). */
export const handleAiParse: JobHandler = async (_job) => {
  throw new Error("not implemented: AI_PARSE");
};
