/**
 * SEO helpers for multi-locale routes.
 *
 * Every translated page MUST emit:
 *  - a self-canonical pointing to ITS locale's URL,
 *  - hreflang alternates for all locales + x-default,
 *  - og:locale + og:locale:alternate entries.
 *
 * Centralised here so every route's head() stays consistent and we
 * can add an automated test that asserts the full alternate set.
 */

import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_BCP47,
  LOCALE_OG,
  buildLocaleUrl,
  type Locale,
} from "./config";

const ORIGIN = "https://yesexperiencesportugal.com";

export interface I18nHeadInput {
  /** Locale-neutral path, e.g. "/about" or "/tours/sintra-private". Always starts with "/". */
  path: string;
  /** Active locale for this render. */
  locale: Locale;
}

export interface I18nHeadOutput {
  links: Array<{ rel: string; href: string; hrefLang?: string }>;
  meta: Array<{ property?: string; name?: string; content: string }>;
}

/**
 * Build the canonical + hreflang link set and the og:locale meta set
 * for a given page. Drop the result into a route's `head()` alongside
 * its title/description meta.
 */
export function buildI18nHead({ path, locale }: I18nHeadInput): I18nHeadOutput {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  const links: I18nHeadOutput["links"] = [
    // Self-canonical points to THIS locale's URL — critical for avoiding
    // duplicate-content penalties across /es and /pt.
    { rel: "canonical", href: buildLocaleUrl(normalized, locale, ORIGIN) },
  ];

  // hreflang alternates for every supported locale.
  for (const l of LOCALES) {
    links.push({
      rel: "alternate",
      hrefLang: LOCALE_BCP47[l],
      href: buildLocaleUrl(normalized, l, ORIGIN),
    });
  }
  // x-default points at the EN version.
  links.push({
    rel: "alternate",
    hrefLang: "x-default",
    href: buildLocaleUrl(normalized, DEFAULT_LOCALE, ORIGIN),
  });

  const meta: I18nHeadOutput["meta"] = [
    { property: "og:locale", content: LOCALE_OG[locale] },
    { property: "og:url", content: buildLocaleUrl(normalized, locale, ORIGIN) },
  ];
  for (const l of LOCALES) {
    if (l === locale) continue;
    meta.push({ property: "og:locale:alternate", content: LOCALE_OG[l] });
  }

  return { links, meta };
}
