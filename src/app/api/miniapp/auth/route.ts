import { z } from "zod";
import { authenticateMiniApp } from "@/server/services/auth";
import { logger } from "@/lib/logger";
import { InitDataExpired, InitDataInvalid, NotAuthorised } from "@/types";

/**
 * Mini App auth (docs/architecture.md §11). The client posts Telegram `initData`; we verify
 * it (HMAC + freshness) and issue the same kind of session cookie the dashboard uses. This
 * is not a parallel auth system — it feeds the same `validateSession` path.
 *
 * We set the cookie directly in the response headers (not via next/headers) with
 * SameSite=None; Secure so it is accepted inside Telegram's embedded WebView, which behaves
 * as a cross-site context and rejects SameSite=Lax cookies set by fetch responses.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ initData: z.string().min(1) });

export async function POST(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });

  try {
    const { token, session } = await authenticateMiniApp(parsed.data.initData);
    // SameSite=None; Secure is required for cookies to work inside Telegram's WebView.
    // next/headers cookies().set() emits SameSite=Lax which Telegram's embedded browser rejects.
    const cookieStr = `session=${token}; HttpOnly; Secure; SameSite=None; Path=/; Expires=${session.expiresAt.toUTCString()}`;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieStr,
      },
    });
  } catch (error) {
    if (
      error instanceof InitDataInvalid ||
      error instanceof InitDataExpired ||
      error instanceof NotAuthorised
    ) {
      logger.warn("miniapp auth rejected", { reason: error.constructor.name });
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    logger.error("miniapp auth threw", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
