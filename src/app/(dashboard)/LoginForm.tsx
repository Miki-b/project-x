"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { loginAction } from "./actions";
import type { LoginState } from "./types";

const INITIAL: LoginState = { error: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, INITIAL);

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-2xl font-semibold">{t("en", "auth.heading")}</h1>
      <form action={action} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("en", "auth.email")}
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("en", "auth.password")}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {t("en", "auth.sign_in")}
        </button>
      </form>
    </main>
  );
}
