import type { JobHandler } from "../types";
import { logger } from "@/lib/logger";

/** AI_PARSE: transcribe + parse a voice note, then reply with a draft (docs/architecture.md §8). */
export const handleAiParse: JobHandler = async (_db, _payload, job) => {
  logger.warn("AI_PARSE handler not yet implemented", { jobId: job.id });
};
