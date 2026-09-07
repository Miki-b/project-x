"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import { registerAttachmentAction } from "@/app/file-actions";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv";

/**
 * Uploads a file straight to Vercel Blob (authorised by /api/upload), then registers the
 * attachment row. Handles the size cap, upload failure, and resets the input so the same file
 * can be re-picked. Server re-validates everything.
 */
export function FileUpload({
  kind,
  id,
  locale,
}: {
  kind: "project" | "task";
  id: string;
  locale: Locale;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > MAX_BYTES) {
      setError(t(locale, "files.too_large"));
      reset();
      return;
    }

    setBusy(true);
    try {
      const blob = await upload(`${kind}/${id}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ kind, id }),
        contentType: file.type || undefined,
      });
      const res = await registerAttachmentAction({
        kind,
        id,
        url: blob.url,
        pathname: blob.pathname,
        name: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });
      if (!res.ok) setError(t(locale, "files.failed"));
      else router.refresh();
    } catch {
      setError(t(locale, "files.failed"));
    } finally {
      setBusy(false);
      reset();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        className={`btn btn-soft self-start ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
      >
        {busy ? t(locale, "files.uploading") : t(locale, "files.add")}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={onChange}
          disabled={busy}
        />
      </label>
      <p className="text-xs text-muted">{t(locale, "files.hint")}</p>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
