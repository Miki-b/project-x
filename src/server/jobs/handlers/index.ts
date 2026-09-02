import type { JobType } from "@prisma/client";
import type { JobHandler } from "../types";
import { handleTaskReminder } from "./taskReminder";
import { handleEndOfDayNudge } from "./endOfDayNudge";
import { handleDailySummary } from "./dailySummary";
import { handleRecurringGenerate } from "./recurringGenerate";
import { handleAiParse } from "./aiParse";

/** Dispatch map: one handler per JobType (docs/architecture.md §8). */
export const handlers: Record<JobType, JobHandler> = {
  TASK_REMINDER: handleTaskReminder,
  END_OF_DAY_NUDGE: handleEndOfDayNudge,
  DAILY_SUMMARY: handleDailySummary,
  RECURRING_GENERATE: handleRecurringGenerate,
  AI_PARSE: handleAiParse,
};
