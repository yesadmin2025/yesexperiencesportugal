/**
 * i18n configuration — single source of truth for supported locales.
 *
 * Keep this file dependency-free; it's imported by client code, server
 * functions, the sitemap, and build-time scripts.
 */

export const LOCALES = ["en", "es", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Human-readable labels for the language switcher. */
export const LOCALE_LABELS: Record<Locale, { short: string; long: string }> = {
  en: { short: "EN", long: "English" },
  es: { short: "ES", long: "Español" },
  pt: { short: "PT", long: "Português" },
};

/** BCP-47 tags emitted in <html lang> and og:locale. */
export const LOCALE_BCP47: Record<Locale, string> = {
  en: "en",
  es: "es-ES",
  pt: "pt-PT",
};

/** og:locale values (full BCP-47 with underscore). */
export const LOCALE_OG: Record<Locale, string> = {
  en: "en_US",
  es: "es_ES",
  pt: "pt_PT",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Build the URL prefix for a locale.
 * EN is the default and has NO prefix — clean URLs preserved.
 * Returns "" for EN, "/es" / "/pt" for others.
 */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/**
 * Given any URL path, return its locale and the path without prefix.
 * "/es/tours/sintra" -> { locale: "es", path: "/tours/sintra" }
 * "/about"           -> { locale: "en", path: "/about" }
 */
export function parseLocaleFromPath(pathname: string): { locale: Locale; path: string } {
  const match = pathname.match(/^\/(es|pt)(\/.*|$)/);
  if (match) {
    return { locale: match[1] as Locale, path: match[2] || "/" };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}

/**
 * Build the absolute URL for a given locale-neutral path in a target locale.
 * Used for hreflang, canonical, and switcher hrefs.
 */
export function buildLocaleUrl(
  basePath: string,
  locale: Locale,
  origin = "https://yesexperiencesportugal.com",
): string {
  const normalized = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return `${origin}${localePrefix(locale)}${normalized === "/" ? "" : normalized}` || `${origin}/`;
}

/** Cookie name used to remember the user's locale across visits. */
export const LOCALE_COOKIE = "yes_locale";
