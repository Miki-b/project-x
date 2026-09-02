import type { JobHandler } from "../types";

/** DAILY_SUMMARY: send the manager an AI-written recap (docs/architecture.md §8). */
export const handleDailySummary: JobHandler = async (_job) => {
  throw new Error("not implemented: DAILY_SUMMARY");
};
