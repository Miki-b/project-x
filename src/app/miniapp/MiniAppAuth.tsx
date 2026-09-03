"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
      const res = await fetch("/api/miniapp/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });
      if (cancelled) return;
      if (res.ok) router.refresh();
      else setState("failed");
    };

    void attempt();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const message =
    state === "no_telegram"
      ? t("en", "miniapp.open_from_telegram")
      : state === "failed"
        ? t("en", "miniapp.auth_failed")
        : t("en", "miniapp.authenticating");

  return <main className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">{message}</main>;
}
