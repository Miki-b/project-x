import type { Locale } from "@/types";
import { t, type TranslationKey, type TranslationParams } from "@/lib/i18n";

/**
 * i18n message builders (docs/architecture.md §9). All bot strings come from i18n — no
 * hardcoded text in handlers. Richer builders (task cards, summaries) live here and
 * compose `t()` calls; this thin wrapper is the shared entry point.
 */
export function msg(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
  return t(locale, key, params);
}
