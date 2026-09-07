import { get } from "@vercel/blob";
import { getCurrentCtx } from "@/server/auth/session";
import { getViewableAttachment } from "@/server/services/attachments";
import { logger } from "@/lib/logger";

/**
 * Authenticated file proxy (docs/architecture.md §4.12). The Blob store is private, so raw blob
 * URLs are not reachable. A file is served only after we confirm the session may view it
 * (project member/manager, or task assignee/manager), then we stream the bytes from Blob.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  const ctx = await getCurrentCtx();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const att = await getViewableAttachment(ctx, id);
  if (!att) return new Response("Not found", { status: 404 });

  try {
    const result = await get(att.pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return new Response("Not found", { status: 404 });
    }
    const filename = encodeURIComponent(att.name);
    return new Response(result.stream as ReadableStream, {
      headers: {
        "Content-Type": att.contentType,
        "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    logger.error("file proxy failed", {
      attachmentId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response("Not found", { status: 404 });
  }
}
