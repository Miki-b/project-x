import { redirect } from "next/navigation";
import { authenticateWebLoginToken } from "@/server/services/auth";
import { setSessionCookie } from "@/server/auth/session";
import { logger } from "@/lib/logger";

/**
 * Bot deep-link login callback (docs/architecture.md §11). The employee tapped the button the
 * bot sent; it carries a short-lived signed token. We verify it, mint a session, and land them
 * on their tasks. First-party top-level navigation, so the default SameSite=Lax cookie is sent.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("t") ?? "";

  let dest = "/app";
  const result = await authenticateWebLoginToken(token);
  if (result) {
    await setSessionCookie(result.token, result.session.expiresAt);
  } else {
    logger.warn("web login token rejected");
    dest = "/app/login?error=1";
  }

  // redirect() throws NEXT_REDIRECT, so keep it out of any try/catch.
  redirect(dest);
}
