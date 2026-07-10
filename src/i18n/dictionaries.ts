/**
 * Dictionary loader — typed, SSR-safe, no runtime libraries.
 *
 * Dictionaries live under `src/content/i18n/<locale>/<namespace>.json`.
 * Any new JSON file dropped in a locale folder is picked up automatically
 * via Vite's eager glob — no loader edit required. All namespaces merge
 * into ONE flat dictionary per locale keyed by "namespace.key" (the JSON
 * files themselves may either be flat or use dotted keys inside a
 * namespace file; both are supported).
 *
 * Missing keys in a non-default locale fall back to EN silently.
 *
 * Phase 2: ES removed. Only `en` and `pt` are shipped.
 */

import type { Locale } from "./config";
import { DEFAULT_LOCALE, LOCALES } from "./config";

export type Dictionary = Record<string, string>;

// Eager glob → bundled at build, no dynamic import cost.
const modules = import.meta.glob("/src/content/i18n/**/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Record<string, string>>;

function buildDictionaries(): Record<Locale, Dictionary> {
  const out = {} as Record<Locale, Dictionary>;
  for (const loc of LOCALES) out[loc] = {};

  for (const [path, json] of Object.entries(modules)) {
    // path is /src/content/i18n/<locale>/<namespace>.json
    const match = path.match(/\/content\/i18n\/([^/]+)\/([^/]+)\.json$/);
    if (!match) continue;
    const [, locale, ns] = match;
    if (!(LOCALES as readonly string[]).includes(locale)) continue;
    const dict = out[locale as Locale];
    for (const [k, v] of Object.entries(json)) {
      // If the JSON key already starts with the namespace prefix (legacy
      // "nav.experiences" style), keep as-is. Otherwise prefix with ns.
      const fullKey = k.startsWith(`${ns}.`) || ns === "common" ? k : `${ns}.${k}`;
      dict[fullKey] = String(v);
    }
  }

  return out;
}

const DICTIONARIES: Record<Locale, Dictionary> = buildDictionaries();

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
