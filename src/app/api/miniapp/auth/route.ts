import { z } from "zod";
import { authenticateMiniApp } from "@/server/services/auth";
import { setSessionCookie } from "@/server/auth/session";
import { InitDataExpired, InitDataInvalid, NotAuthorised } from "@/types";

/**
 * Mini App auth (docs/architecture.md §11). The client posts Telegram `initData`; we verify
 * it (HMAC + freshness) and issue the same kind of session cookie the dashboard uses. This
 * is not a parallel auth system — it feeds the same `validateSession` path.
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
    await setSessionCookie(token, session.expiresAt);
    return Response.json({ ok: true });
  } catch (error) {
    if (
      error instanceof InitDataInvalid ||
      error instanceof InitDataExpired ||
      error instanceof NotAuthorised
    ) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
