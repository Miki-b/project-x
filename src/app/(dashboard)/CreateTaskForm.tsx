"use client";

import { useActionState } from "react";
import type { User } from "@/generated/prisma/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import type { TaskFormState } from "./types";
import { createTaskAction } from "./actions";

const INITIAL: TaskFormState = {};

export function CreateTaskForm({ members, locale }: { members: User[]; locale: Locale }) {
  const [state, action, pending] = useActionState(createTaskAction, INITIAL);
  const activeMembers = members.filter((m) => m.status === "ACTIVE");

  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        {t(locale, "dashboard.task_title")}
        <input
          name="title"
          type="text"
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t(locale, "dashboard.task_assignee")}
        <select
          name="assigneeId"
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">{t(locale, "dashboard.task_no_assignee_option")}</option>
          {activeMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t(locale, "dashboard.task_description")}
        <textarea
          name="description"
          rows={2}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t(locale, "dashboard.task_due")}
        <input
          name="dueAt"
          type="datetime-local"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {t(locale, "dashboard.task_submit")}
      </button>
    </form>
  );
}
