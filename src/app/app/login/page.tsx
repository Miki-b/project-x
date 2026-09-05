import { redirect } from "next/navigation";
import { getMiniAppCtx } from "@/server/auth/session";
import { t } from "@/lib/i18n";
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">{t("en", "employee.login_heading")}</h1>
      <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-400">
        {t("en", "employee.login_hint")}
      </p>
      {error ? <p className="text-sm text-red-600">{t("en", "employee.login_error")}</p> : null}
      {botUsername && appUrl ? (
        <TelegramLoginButton botUsername={botUsername} authUrl={authUrl} />
      ) : (
        <p className="text-sm text-amber-600">{t("en", "employee.login_unconfigured")}</p>
      )}
    </main>
  );
}
