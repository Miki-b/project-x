import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import type { AttachmentWithUploader } from "@/server/services/attachments";
import { deleteAttachmentAction } from "@/app/file-actions";

/**
 * Renders a list of attachments with a download link, size, uploader, and (when allowed) a
 * delete control. Deletion is authorised server-side too; `actorId`/`isManager` only decide
 * whether to *show* the button.
 */
export function AttachmentList({
  attachments,
  locale,
  actorId,
  isManager,
}: {
  attachments: AttachmentWithUploader[];
  locale: Locale;
  actorId: string;
  isManager: boolean;
}) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted">{t(locale, "files.empty")}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((a) => {
        const canDelete = isManager || a.uploadedById === actorId;
        return (
          <li key={a.id} className="glass flex items-center gap-3 rounded-xl p-2.5">
            <span aria-hidden className="text-lg">
              {fileGlyph(a.contentType)}
            </span>
            <div className="min-w-0 flex-1">
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="link block truncate text-sm font-medium"
              >
                {a.name}
              </a>
              <div className="text-xs text-muted">
                {formatSize(a.size)} · {t(locale, "files.by", { name: a.uploadedBy.name || "—" })}
              </div>
            </div>
            {canDelete ? (
              <form action={deleteAttachmentAction}>
                <input type="hidden" name="attachmentId" value={a.id} />
                <button
                  type="submit"
                  aria-label={t(locale, "files.delete")}
                  className="shrink-0 rounded-md px-2 py-1 text-sm text-muted transition-colors hover:text-red-500"
                >
                  ✕
                </button>
              </form>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function fileGlyph(contentType: string): string {
  if (contentType.startsWith("image/")) return "🖼️";
  if (contentType === "application/pdf") return "📄";
  if (contentType.includes("sheet") || contentType.includes("excel") || contentType === "text/csv")
    return "📊";
  if (contentType.includes("word")) return "📝";
  return "📎";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
