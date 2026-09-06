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
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="field-label">{t(locale, "dashboard.task_title")}</span>
        <input name="title" type="text" required className="input" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="field-label">{t(locale, "dashboard.task_assignee")}</span>
          <select name="assigneeId" required className="input">
            <option value="">{t(locale, "dashboard.task_no_assignee_option")}</option>
            {activeMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">{t(locale, "dashboard.task_due")}</span>
          <input name="dueAt" type="datetime-local" className="input" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="field-label">{t(locale, "dashboard.task_description")}</span>
        <textarea name="description" rows={2} className="input resize-y" />
      </label>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {t(locale, "dashboard.task_submit")}
      </button>
    </form>
  );
}
