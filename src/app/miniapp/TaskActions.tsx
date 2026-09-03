"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TaskStatus } from "@/generated/prisma/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import { changeStatusAction, blockAction, attachNoteAction } from "./actions";

// Status buttons ("Start" / "I'm done" / "I'm stuck") + a text-note proof box.
// Photo proof comes via the bot for now (we store Telegram file_ids, not uploads).
const BTN = "flex-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50";

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
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex gap-2">
        {canStart && (
          <button
            className={`${BTN} bg-blue-600 text-white`}
            disabled={pending}
            onClick={() => run(() => changeStatusAction(taskId, "IN_PROGRESS"))}
          >
            {t(locale, "miniapp.action.start")}
          </button>
        )}
        {canDone && (
          <button
            className={`${BTN} bg-green-600 text-white`}
            disabled={pending}
            onClick={() => run(() => changeStatusAction(taskId, "DONE"))}
          >
            {t(locale, "miniapp.action.done")}
          </button>
        )}
        {canBlock && (
          <button
            className={`${BTN} bg-amber-500 text-white`}
            disabled={pending}
            onClick={() => setReasonOpen((v) => !v)}
          >
            {t(locale, "miniapp.action.blocked")}
          </button>
        )}
      </div>

      {reasonOpen && (
        <div className="flex flex-col gap-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t(locale, "miniapp.blocked_reason_placeholder")}
            rows={2}
            className="rounded-lg border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            className={`${BTN} bg-amber-600 text-white`}
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

      <div className="mt-2 flex flex-col gap-2">
        <label className="text-sm font-medium">{t(locale, "miniapp.add_proof")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t(locale, "miniapp.note_placeholder")}
          rows={2}
          className="rounded-lg border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          className={`${BTN} bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black`}
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
        <p className="text-xs text-zinc-500">{t(locale, "miniapp.photo_hint")}</p>
      </div>
    </div>
  );
}
