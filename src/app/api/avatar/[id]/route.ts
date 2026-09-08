import { get } from "@vercel/blob";
import { getCurrentCtx } from "@/server/auth/session";
import { orgDb } from "@/server/db/client";
import { logger } from "@/lib/logger";

/**
 * Avatar proxy (docs/architecture.md §4.13). Avatars live in the private Blob store, so they
 * are streamed only to signed-in users, and only for members of the same org (orgDb scoping).
 * Falls back to 404 when the user has no avatar — the UI then renders initials.
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

  // orgDb scopes to the caller's org, so teammate avatars are viewable but cross-org is not.
  const user = await orgDb(ctx.orgId).user.findFirst({
    where: { id },
    select: { avatarPathname: true },
  });
  if (!user?.avatarPathname) return new Response("Not found", { status: 404 });

  try {
    const result = await get(user.avatarPathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(result.stream as ReadableStream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    logger.error("avatar proxy failed", {
      userId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response("Not found", { status: 404 });
  }
}
