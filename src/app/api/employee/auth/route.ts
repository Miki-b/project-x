import { redirect } from "next/navigation";
import { authenticateEmployeeLogin } from "@/server/services/auth";
import { setSessionCookie } from "@/server/auth/session";
import { InitDataExpired, InitDataInvalid, NotAuthorised } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Employee browser sign-in (docs/architecture.md §11). Telegram's Login Widget redirects the
 * top-level window here (GET) with the signed user fields as query params. We verify them and
 * issue the same session cookie the Mini App and dashboard use. First-party navigation, so the
 * default SameSite=Lax cookie is delivered on the redirect to /app.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const params: Record<string, string> = {};
  for (const [key, value] of new URL(req.url).searchParams) params[key] = value;

  let dest = "/app";
  try {
    const { token, session } = await authenticateEmployeeLogin(params);
    await setSessionCookie(token, session.expiresAt);
  } catch (error) {
    if (
      error instanceof InitDataInvalid ||
      error instanceof InitDataExpired ||
      error instanceof NotAuthorised
    ) {
      logger.warn("employee login rejected", { reason: error.constructor.name });
      dest = "/app/login?error=1";
    } else {
      throw error;
    }
  }

  // redirect() throws NEXT_REDIRECT, so it must run outside the try/catch above.
  redirect(dest);
}
