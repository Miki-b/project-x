import { redirect } from "next/navigation";
import { getMiniAppCtx } from "@/server/auth/session";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";

// Public sign-in page for the employee web app. If already signed in, go straight to the tasks.
export const dynamic = "force-dynamic";

export default async function EmployeeLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await getMiniAppCtx();
  if (ctx) redirect("/app");

  const { error } = await searchParams;
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ?? "";
  // Deep-links into the bot; it replies with a one-tap button that signs the browser in.
  const startLink = `https://t.me/${botUsername}?start=weblogin`;

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="card animate-rise w-full max-w-sm p-7 text-center">
        <div className="mx-auto mb-4 inline-grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-fg shadow-[var(--shadow-primary)]">
          <BrandMark size={22} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("en", "employee.login_heading")}
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          {t("en", "employee.login_hint")}
        </p>

        {error ? (
          <p className="mt-3 text-sm text-red-500">{t("en", "employee.login_error")}</p>
        ) : null}

        <div className="mt-6">
          {botUsername ? (
            <a href={startLink} className="btn btn-primary w-full">
              <TelegramGlyph />
              {t("en", "employee.continue_with_telegram")}
            </a>
          ) : (
            <p className="text-sm text-amber-500">{t("en", "employee.login_unconfigured")}</p>
          )}
        </div>

        <p className="mt-4 text-xs text-muted">{t("en", "employee.login_steps")}</p>
      </div>
    </main>
  );
}

function TelegramGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.9 4.3 18.6 20c-.24 1.09-.9 1.36-1.82.85l-5.03-3.71-2.43 2.34c-.27.27-.5.5-1 .5l.36-5.09L18 5.5c.4-.36-.09-.56-.62-.2L6.9 13.02l-4.9-1.53c-1.07-.34-1.09-1.07.22-1.58L20.5 2.9c.89-.33 1.67.2 1.4 1.4Z" />
    </svg>
  );
}
