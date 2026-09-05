"use client";

import { useEffect, useRef } from "react";

/**
 * Renders Telegram's Login Widget. The widget is an injected <script> that draws an iframe
 * button; on success Telegram redirects the top-level window to `authUrl` with the signed user
 * fields as query params (handled by /api/employee/auth). Requires the bot's domain to be set
 * in @BotFather (/setdomain) to match this site, or the widget shows "Bot domain invalid".
 */
export function TelegramLoginButton({
  botUsername,
  authUrl,
}: {
  botUsername: string;
  authUrl: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-auth-url", authUrl);
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);
    return () => container.replaceChildren();
  }, [botUsername, authUrl]);

  return <div ref={ref} />;
}
