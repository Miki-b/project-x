"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MadeByApexHub } from "@/components/MadeByApexHub";
import { loginAction } from "./actions";
import type { LoginState } from "./types";

const INITIAL: LoginState = { error: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, INITIAL);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-5 p-6">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="card animate-rise w-full max-w-sm p-7">
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Soso_logo.png" alt="Soso" className="mb-5 h-9 w-auto" />
          <h1 className="text-2xl font-semibold tracking-tight">{t("en", "auth.heading")}</h1>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="field-label">{t("en", "auth.email")}</span>
            <input name="email" type="email" autoComplete="username" required className="input" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">{t("en", "auth.password")}</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
            />
          </label>
          {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
          <button type="submit" disabled={pending} className="btn btn-primary mt-1 w-full">
            {t("en", "auth.sign_in")}
          </button>
        </form>
      </div>

      <MadeByApexHub />
    </main>
  );
}
