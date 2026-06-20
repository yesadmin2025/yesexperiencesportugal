/**
 * Tiny i18n helper for component-local dictionaries.
 *
 * Components often inline small label dictionaries keyed by locale
 * (e.g. CHIP_I18N in BuilderMap). The risk is that if a key is missing
 * in the user's locale — even by accident during a copy edit — the UI
 * shows `undefined`.
 *
 * `mergeLocale(dict, locale)` returns a flat object that merges the EN
 * dictionary as the safety net under the requested locale, so every key
 * resolves: locale value if present, else EN, else the original key
 * stays untouched (caller can still detect absence by missing properties).
 *
 * Also tolerates unknown / undefined locales (defaults to EN), which
 * protects against a stray locale prop value at the boundary.
 */

export type SupportedLocale = "pt" | "en" | "es" | "fr";

type LocaleDict<K extends string> = Record<SupportedLocale, Record<K, string>>;

export function mergeLocale<K extends string>(
  dict: LocaleDict<K>,
  locale: SupportedLocale | string | undefined | null,
): Record<K, string> {
  const safe: SupportedLocale =
    locale === "pt" || locale === "en" || locale === "es" || locale === "fr" ? locale : "en";
  // Per-key fallback: EN provides the safety net, locale overrides.
  return { ...dict.en, ...(dict[safe] ?? {}) } as Record<K, string>;
}
