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
    // duplicate-content penalties across / and /pt.
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

/**
 * Reciprocal hreflang alternates ONLY (no canonical, no og:url).
 *
 * Use this in routes that already emit their own self-canonical so the
 * EN and PT twins advertise the identical alternate set. Both sides must
 * call it with the same locale-neutral `path` — that reciprocity is what
 * Google requires; a one-way annotation is ignored.
 *
 * Only call it for paths that have a genuine, human-reviewed translation
 * on both sides (see `PT_PAIRED_PATHS` in `./pt-ready`). Never point an
 * alternate at a redirect stub or a missing page.
 */
export function localeAlternateLinks(path: string): Array<{
  rel: "alternate";
  hrefLang: string;
  href: string;
}> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // buildLocaleUrl returns a bare origin for "/" — keep the trailing slash so
  // the alternate matches the homepage canonical byte-for-byte.
  const href = (l: Locale) => {
    const url = buildLocaleUrl(normalized, l, ORIGIN);
    return url === ORIGIN ? `${ORIGIN}/` : url;
  };
  const links = LOCALES.map((l) => ({
    rel: "alternate" as const,
    hrefLang: LOCALE_BCP47[l],
    href: href(l),
  }));
  links.push({
    rel: "alternate" as const,
    hrefLang: "x-default",
    href: href(DEFAULT_LOCALE),
  });
  return links;
}
