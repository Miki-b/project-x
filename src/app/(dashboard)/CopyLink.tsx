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
    <div className="flex gap-2">
      <input
        ref={inputRef}
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="input flex-1 font-mono text-xs"
      />
      <button type="button" onClick={copy} className="btn btn-primary shrink-0">
        {copied ? t(locale, "dashboard.copied") : t(locale, "dashboard.copy")}
      </button>
    </div>
  );
}
