import { webhookCallback } from "grammy";
import { getBot } from "@/server/telegram/bot";

/**
 * Telegram webhook entry point (docs/architecture.md §3, §9, §11).
 * Production uses webhook mode. Telegram's secret token is verified on every request;
 * a missing or mismatched header is rejected before the update is processed.
 * Rate limiting is applied at the edge/proxy layer (§11).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const header = req.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || header !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const handle = webhookCallback(getBot(), "std/http");
  return handle(req);
}
