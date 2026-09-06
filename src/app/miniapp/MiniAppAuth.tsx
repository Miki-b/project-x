"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";

// Bootstrap: read Telegram initData on the client, POST it to exchange for a session cookie,
// then refresh so the server components render with the session (docs/architecture.md §11).
type State = "loading" | "failed" | "no_telegram";

interface TelegramWebApp {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
}
declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function MiniAppAuth() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const attempt = async () => {
      const wa = window.Telegram?.WebApp;
      if (!wa) {
        if (tries++ < 20) {
          setTimeout(attempt, 100); // SDK script may still be loading
          return;
        }
        if (!cancelled) setState("no_telegram");
        return;
      }
      wa.ready?.();
      wa.expand?.();
      const initData = wa.initData;
      if (!initData) {
        if (!cancelled) setState("no_telegram");
        return;
      }
      try {
        const res = await fetch("/api/miniapp/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        if (cancelled) return;
        if (res.ok) {
          // Hard reload so the cookie is definitely sent on the next request.
          // router.refresh() is unreliable in Telegram's webview.
          window.location.reload();
        } else {
          setState("failed");
        }
      } catch {
        if (!cancelled) setState("failed");
      }
    };

    void attempt();
    return () => {
      cancelled = true;
    };
  }, []);

  const message =
    state === "no_telegram"
      ? t("en", "miniapp.open_from_telegram")
      : state === "failed"
        ? t("en", "miniapp.auth_failed")
        : t("en", "miniapp.authenticating");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      {state === "loading" ? (
        <span
          aria-hidden
          className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary"
        />
      ) : null}
      <p className="max-w-xs text-sm text-muted">{message}</p>
    </main>
  );
}
