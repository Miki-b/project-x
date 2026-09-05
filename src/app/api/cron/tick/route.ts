import { tick } from "@/server/jobs/runner";
import { logger } from "@/lib/logger";

/**
 * Scheduled-job processor (docs/architecture.md §8, docs/deploy.md).
 *
 * Runs ONE poll iteration of the job runner: reclaim stale locks, claim due jobs, dispatch
 * each. There is no always-on worker; this route is pinged on a schedule instead (a free
 * GitHub Actions workflow, .github/workflows/cron-tick.yml, and/or Vercel Cron). Both send
 * `Authorization: Bearer <CRON_SECRET>`, which we verify so the endpoint can't be triggered
 * by anyone else.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await tick();
    return Response.json({ ok: true });
  } catch (err) {
    logger.error("cron tick failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ ok: false }, { status: 500 });
  }
}
