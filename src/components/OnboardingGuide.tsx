"use client";

import { useState, useSyncExternalStore } from "react";
import type { Locale } from "@/types";
import { t } from "@/lib/i18n";
import { BrandMark } from "./BrandMark";

/**
 * First-login walkthrough — a small chat-style assistant that introduces the app, tailored to
 * the manager or employee. Shows once per browser (localStorage), dismissable any time. Reads
 * the "seen" flag via useSyncExternalStore so there's no setState-in-effect and no SSR flash.
 */

const MANAGER_STEPS = [
  "onboarding.manager.s1",
  "onboarding.manager.s2",
  "onboarding.manager.s3",
  "onboarding.manager.s4",
  "onboarding.manager.s5",
] as const;

const EMPLOYEE_STEPS = [
  "onboarding.employee.s1",
  "onboarding.employee.s2",
  "onboarding.employee.s3",
  "onboarding.employee.s4",
  "onboarding.employee.s5",
] as const;

export function OnboardingGuide({ role, locale }: { role: "manager" | "employee"; locale: Locale }) {
  const storageKey = `pxp:onboarding:${role}:v1`;
  const seen = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(storageKey) === "1";
      } catch {
        return true;
      }
    },
    () => true, // SSR: assume seen so nothing renders until the client confirms
  );

  const [closed, setClosed] = useState(false);
  const [shown, setShown] = useState(1);

  const steps = role === "manager" ? MANAGER_STEPS : EMPLOYEE_STEPS;
  if (seen || closed) return null;

  const isLast = shown >= steps.length;

  function dismiss() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setClosed(true);
  }

  function next() {
    if (isLast) dismiss();
    else setShown((s) => s + 1);
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 z-50 sm:left-auto sm:w-[360px]">
      <div className="glass animate-rise overflow-hidden rounded-2xl shadow-[var(--shadow-card-hover)]">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg shadow-[var(--shadow-primary)]">
            <BrandMark size={16} />
          </span>
          <span className="font-display text-sm font-semibold">{t(locale, "onboarding.title")}</span>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t(locale, "onboarding.skip")}
            className="ml-auto rounded-md px-2 py-1 text-sm text-muted transition-colors hover:text-fg"
          >
            ✕
          </button>
        </div>

        <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto p-4">
          {steps.slice(0, shown).map((key) => (
            <p
              key={key}
              className="animate-rise max-w-[90%] rounded-2xl rounded-tl-sm bg-surface-2 px-3 py-2 text-sm"
            >
              {t(locale, key)}
            </p>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="text-xs text-muted">
            {shown} / {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {!isLast ? (
              <button type="button" onClick={dismiss} className="btn btn-ghost h-9 px-3 text-sm">
                {t(locale, "onboarding.skip")}
              </button>
            ) : null}
            <button type="button" onClick={next} className="btn btn-primary h-9 px-4 text-sm">
              {isLast ? t(locale, "onboarding.done") : t(locale, "onboarding.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
