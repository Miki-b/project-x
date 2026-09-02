import { t } from "@/lib/i18n";
import type { Locale } from "@/types";

// Placeholder dashboard. Real pages are built during feature work.
// User-facing strings go through i18n even here (docs/product.md §8). Locale will come
// from the manager's session; default to English until auth is wired.
const DEFAULT_LOCALE: Locale = "en";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">{t(DEFAULT_LOCALE, "dashboard.title")}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {t(DEFAULT_LOCALE, "dashboard.placeholder")}
      </p>
    </main>
  );
}
