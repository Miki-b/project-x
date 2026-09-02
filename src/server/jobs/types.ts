import type { Job } from "@prisma/client";

/** A job handler executes one claimed job. Throwing marks the job failed (retry/backoff). */
export type JobHandler = (job: Job) => Promise<void>;
