"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TaskStatus } from "@/generated/prisma/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import { changeStatusAction, blockAction, attachNoteAction } from "./actions";

// Status buttons ("Start" / "I'm done" / "I'm stuck") + a text-note proof box.
// Photo proof comes via the bot for now (we store Telegram file_ids, not uploads).
export function TaskActions({
  taskId,
  status,
  locale,
}: {
  taskId: string;
  status: TaskStatus;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
      } finally {
        router.refresh();
      }
    });

  const canStart = status === "PENDING" || status === "BLOCKED";
  const canDone = status === "PENDING" || status === "IN_PROGRESS" || status === "BLOCKED";
  const canBlock = status === "PENDING" || status === "IN_PROGRESS";

  return (
    <div className="mt-5 flex flex-col gap-3">
      {(canStart || canDone || canBlock) && (
        <div className="flex flex-wrap gap-2">
          {canStart && (
            <button
              className="btn btn-primary flex-1"
              disabled={pending}
              onClick={() => run(() => changeStatusAction(taskId, "IN_PROGRESS"))}
            >
              {t(locale, "miniapp.action.start")}
            </button>
          )}
          {canDone && (
            <button
              className="btn flex-1 bg-emerald-600 text-white shadow-[0_6px_18px_-6px_rgba(5,150,105,0.5)] hover:-translate-y-px"
              disabled={pending}
              onClick={() => run(() => changeStatusAction(taskId, "DONE"))}
            >
              {t(locale, "miniapp.action.done")}
            </button>
          )}
          {canBlock && (
            <button
              className="btn flex-1 bg-amber-500 text-white shadow-[0_6px_18px_-6px_rgba(245,158,11,0.5)] hover:-translate-y-px"
              disabled={pending}
              onClick={() => setReasonOpen((v) => !v)}
            >
              {t(locale, "miniapp.action.blocked")}
            </button>
          )}
        </div>
      )}

      {reasonOpen && (
        <div className="animate-rise flex flex-col gap-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t(locale, "miniapp.blocked_reason_placeholder")}
            rows={2}
            className="input resize-y"
          />
          <button
            className="btn bg-amber-600 text-white hover:-translate-y-px disabled:hover:translate-y-0"
            disabled={pending || reason.trim() === ""}
            onClick={() =>
              run(async () => {
                await blockAction(taskId, reason);
                setReason("");
                setReasonOpen(false);
              })
            }
          >
            {t(locale, "miniapp.action.blocked")}
          </button>
        </div>
      )}

      <div className="card mt-1 flex flex-col gap-2 p-3">
        <label className="field-label">{t(locale, "miniapp.add_proof")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t(locale, "miniapp.note_placeholder")}
          rows={2}
          className="input resize-y"
        />
        <button
          className="btn btn-soft self-start"
          disabled={pending || note.trim() === ""}
          onClick={() =>
            run(async () => {
              await attachNoteAction(taskId, note);
              setNote("");
            })
          }
        >
          {t(locale, "miniapp.attach")}
        </button>
        <p className="text-xs text-muted">{t(locale, "miniapp.photo_hint")}</p>
      </div>
    </div>
  );
}
