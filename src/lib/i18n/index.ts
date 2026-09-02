import type { Locale } from "@/types";
import en from "./en.json";
import am from "./am.json";

/**
 * Typed i18n lookup (docs/architecture.md §9, docs/product.md §8).
 * No hardcoded user-facing strings anywhere — every string goes through a key.
 * English is the source of truth for the available key set.
 */

const dictionaries: Record<Locale, unknown> = { en, am };

type Join<K extends string, P extends string> = P extends "" ? K : `${K}.${P}`;
type Paths<T> = T extends string
  ? ""
  : { [K in keyof T & string]: Join<K, Paths<T[K]>> }[keyof T & string];

/** Dot-path of every leaf string in the English dictionary. */
export type TranslationKey = Paths<typeof en>;

export type TranslationParams = Record<string, string | number>;

function resolve(dict: unknown, key: string): string | undefined {
  let cursor: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof cursor !== "object" || cursor === null || !(part in cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === "string" ? cursor : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
    name in params ? String(params[name]) : `{{${name}}}`,
  );
}

/**
 * Translate `key` for `locale`, interpolating `{{param}}` placeholders.
 * Falls back to English, then to the raw key, so a missing translation is never a crash.
 */
export function t(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
  const template = resolve(dictionaries[locale], key) ?? resolve(en, key) ?? key;
  return interpolate(template, params);
}
