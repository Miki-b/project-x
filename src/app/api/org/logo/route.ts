import { get } from "@vercel/blob";
import { getCurrentCtx } from "@/server/auth/session";
import { basePrisma } from "@/server/db/client";
import { logger } from "@/lib/logger";

/**
 * Org logo proxy (docs/architecture.md §4.14). Serves the signed-in user's OWN organisation
 * logo from the private Blob store — so every member sees their org's logo, and no one else's.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const ctx = await getCurrentCtx();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const dark = new URL(req.url).searchParams.get("variant") === "dark";
  const org = await basePrisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { logoPathname: true, logoDarkPathname: true },
  });
  const pathname = dark ? org?.logoDarkPathname : org?.logoPathname;
  if (!pathname) return new Response("Not found", { status: 404 });

  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(result.stream as ReadableStream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "image/png",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    logger.error("org logo proxy failed", {
      orgId: ctx.orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response("Not found", { status: 404 });
  }
}
