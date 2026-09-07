"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/types";
import { setLocaleAction } from "@/app/locale-action";

// Native language names — a language switcher conventionally shows each language in its own script.
const LABELS: Record<Locale, string> = { en: "EN", am: "አማ" };

export function LanguageSelector({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === current || pending) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div className="glass inline-flex rounded-full p-0.5 text-xs font-semibold">
      {(["en", "am"] as const).map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => choose(locale)}
          disabled={pending}
          aria-pressed={current === locale}
          className={`rounded-full px-2.5 py-1 transition-colors disabled:opacity-60 ${
            current === locale ? "text-primary-fg" : "text-muted hover:text-fg"
          }`}
          style={current === locale ? { background: "var(--primary)" } : undefined}
        >
          {LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
