import type { Job } from "@prisma/client";
import type { OrgDb } from "@/server/db/client";

/** Job row metadata passed to a handler — everything except the raw `payload`. */
export type JobMeta = Omit<Job, "payload">;

/**
 * A job handler receives an ALREADY org-scoped client and the typed payload; it can never
 * obtain an unscoped client (docs/architecture.md §5, §8). The runner claims the job,
 * builds `orgDb(job.orgId)`, validates the payload, and passes both in. Throwing marks the
 * job failed (retry/backoff).
 */
export type JobHandler<T = unknown> = (db: OrgDb, payload: T, job: JobMeta) => Promise<void>;
