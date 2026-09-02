import type { JobHandler } from "../types";

/** END_OF_DAY_NUDGE: message assignees with untouched tasks (docs/architecture.md §8). */
export const handleEndOfDayNudge: JobHandler = async (_db, _payload, _job) => {
  throw new Error("not implemented: END_OF_DAY_NUDGE");
};
