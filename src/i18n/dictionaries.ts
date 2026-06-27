/**
 * Dictionary loader — typed, SSR-safe, no runtime libraries.
 *
 * Dictionaries are plain JSON, namespaced per page or area
 * (common, nav, footer, home, studio, etc.). Each locale ships
 * the same set of namespaces; missing keys fall back to EN.
 *
 * Static imports keep tree-shaking honest and avoid dynamic-import
 * surprises during SSR on the Worker runtime.
 */

import type { Locale } from "./config";
import { DEFAULT_LOCALE } from "./config";

import enCommon from "@/content/i18n/en/common.json";
import esCommon from "@/content/i18n/es/common.json";
import ptCommon from "@/content/i18n/pt/common.json";

export type Dictionary = Record<string, string>;

const DICTIONARIES: Record<Locale, Dictionary> = {
  en: { ...(enCommon as Dictionary) },
  es: { ...(esCommon as Dictionary) },
  pt: { ...(ptCommon as Dictionary) },
};

/** Get the merged dictionary for a locale (with EN fallback baked in). */
export function getDictionary(locale: Locale): Dictionary {
  if (locale === DEFAULT_LOCALE) return DICTIONARIES.en;
  // Layer locale on top of EN so missing keys fall back silently.
  return { ...DICTIONARIES.en, ...DICTIONARIES[locale] };
}

/**
 * Translate a key with optional `{placeholder}` interpolation.
 * Returns the key itself if the dictionary has no entry — visible in
 * dev, harmless in prod, easy to grep for unfilled strings.
 */
export function translate(
  dict: Dictionary,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = dict[key];
  if (raw === undefined) return key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
  );
}
