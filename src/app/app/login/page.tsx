import { redirect } from "next/navigation";
import { getMiniAppCtx } from "@/server/auth/session";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";
import { TelegramLoginButton } from "../TelegramLoginButton";

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  const authUrl = `${appUrl}/api/employee/auth`;

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

        <div className="mt-6 flex justify-center">
          {botUsername && appUrl ? (
            <TelegramLoginButton botUsername={botUsername} authUrl={authUrl} />
          ) : (
            <p className="text-sm text-amber-500">{t("en", "employee.login_unconfigured")}</p>
          )}
        </div>
      </div>
    </main>
  );
}
