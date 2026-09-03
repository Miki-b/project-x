"use client";

import { useRef, useState } from "react";
import { t } from "@/lib/i18n";
import type { Locale } from "@/types";

/**
 * Shows the invite URL in a read-only field with a copy button. Falls back to selecting the
 * text if the clipboard API is unavailable (e.g. plain-http over a LAN IP on a phone).
 */
export function CopyLink({ url, locale }: { url: string; locale: Locale }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      inputRef.current?.select();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        ref={inputRef}
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="button"
        onClick={copy}
        className="whitespace-nowrap rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
      >
        {copied ? t(locale, "dashboard.copied") : t(locale, "dashboard.copy")}
      </button>
    </div>
  );
}
