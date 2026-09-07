"use client";

import { useActionState } from "react";
import type { User } from "@/generated/prisma/client";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import type { ProjectFormState } from "./types";
import { createProjectAction } from "./actions";

const INITIAL: ProjectFormState = {};

export function CreateProjectForm({ members, locale }: { members: User[]; locale: Locale }) {
  const [state, action, pending] = useActionState(createProjectAction, INITIAL);
  const activeMembers = members.filter((m) => m.status === "ACTIVE");

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="field-label">{t(locale, "projects.name")}</span>
        <input name="name" type="text" required className="input" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="field-label">{t(locale, "projects.description")}</span>
        <textarea name="description" rows={2} className="input resize-y" />
      </label>

      <fieldset>
        <legend className="field-label">{t(locale, "projects.members")}</legend>
        {activeMembers.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t(locale, "dashboard.empty_team")}</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {activeMembers.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  name="memberIds"
                  value={m.id}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <span className="truncate">{m.name || "—"}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {t(locale, "projects.create")}
      </button>
    </form>
  );
}
