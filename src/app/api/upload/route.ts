import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { getCurrentCtx } from "@/server/auth/session";
import {
  assertCanUpload,
  ALLOWED_CONTENT_TYPES,
  MAX_ATTACHMENT_BYTES,
} from "@/server/services/attachments";
import { NotAuthorised } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Client-upload token endpoint (docs/architecture.md §4.12). The browser asks for a one-time
 * token before uploading a file straight to Vercel Blob (bypassing the serverless body limit).
 * We authorise here — the session must be allowed to upload to the given project/task — and cap
 * the size + content types the token permits. The DB row is created afterwards via
 * registerAttachmentAction (onUploadCompleted can't reach localhost during dev).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PayloadSchema = z.object({ kind: z.enum(["project", "task"]), id: z.string().min(1) });

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const ctx = await getCurrentCtx();
        if (!ctx) throw new NotAuthorised();
        const target = PayloadSchema.parse(JSON.parse(clientPayload ?? "{}"));
        await assertCanUpload(ctx, target);
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_ATTACHMENT_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ kind: target.kind, id: target.id }),
        };
      },
      onUploadCompleted: async () => {
        /* no-op — the client registers the attachment row after the upload resolves */
      },
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof NotAuthorised) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    logger.warn("upload token request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}
