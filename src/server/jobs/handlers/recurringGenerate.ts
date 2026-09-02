import type { JobHandler } from "../types";

/** RECURRING_GENERATE: materialise tasks from active templates (docs/architecture.md §8). */
export const handleRecurringGenerate: JobHandler = async (_job) => {
  throw new Error("not implemented: RECURRING_GENERATE");
};
