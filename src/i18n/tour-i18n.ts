/**
 * Tour i18n overlay — Phase 2 architecture.
 *
 * SignatureTour data is authored in English. To ship Portuguese without
 * duplicating every tour object, we allow an optional per-tour overlay
 * on translatable fields, resolved at render time via `localizeTour()`.
 *
 * Only string-shaped, human-facing fields participate:
 *   title, blurb, intro, fitsBest, theme, region,
 *   highlights[], included[], idealFor[], notes[],
 *   stops[].label, stops[].story,
 *   seoTitle, seoDescription.
 *
 * A tour is considered "PT-ready" when `ptReady === true`. Phase 4
 * (bilingual SEO) uses this flag to decide whether to emit `/pt/tours/<id>`
 * in the sitemap and hreflang set. Until a tour is marked ready, PT
 * requests fall back to English content — never to auto-translated prose.
 */

import type { SignatureTour, TourStop } from "@/data/signatureTours";
import type { Locale } from "./config";
import { DEFAULT_LOCALE } from "./config";

/** Per-locale overlay for a single tour. All fields are optional. */
export interface TourLocaleOverlay {
  title?: string;
  blurb?: string;
  intro?: string;
  fitsBest?: string;
  theme?: string;
  region?: string;
  highlights?: string[];
  included?: string[];
  idealFor?: string[];
  notes?: string[];
  /** Per-stop overrides keyed by the stop's English `label`. */
  stops?: Record<string, { label?: string; story?: string }>;
  seoTitle?: string;
  seoDescription?: string;
}

/**
 * Attach this to a SignatureTour to declare translations.
 * Kept as a loose Record so we can add locales without a code change.
 */
export type TourI18nMap = Partial<Record<Locale, TourLocaleOverlay>>;

/**
 * Extended tour shape accepted by the localizer. The base SignatureTour
 * type may not yet declare these optional fields; we read them defensively.
 */
type LocalizableTour = SignatureTour & {
  i18n?: TourI18nMap;
  ptReady?: boolean;
};

/**
 * Return a copy of the tour with fields swapped for the target locale.
 * Missing fields fall back to English. Safe to call with any locale.
 */
export function localizeTour(tour: SignatureTour, locale: Locale): SignatureTour {
  if (locale === DEFAULT_LOCALE) return tour;
  const t = tour as LocalizableTour;
  const overlay = t.i18n?.[locale];
  if (!overlay) return tour;

  const stopsOverlay = overlay.stops ?? {};
  const stops: TourStop[] = tour.stops.map((s) => {
    const o = stopsOverlay[s.label];
    if (!o) return s;
    return { ...s, label: o.label ?? s.label, story: o.story ?? s.story };
  });

  return {
    ...tour,
    title: overlay.title ?? tour.title,
    blurb: overlay.blurb ?? tour.blurb,
    intro: overlay.intro ?? tour.intro,
    fitsBest: overlay.fitsBest ?? tour.fitsBest,
    theme: overlay.theme ?? tour.theme,
    region: overlay.region ?? tour.region,
    highlights: overlay.highlights ?? tour.highlights,
    included: overlay.included ?? tour.included,
    idealFor: overlay.idealFor ?? tour.idealFor,
    notes: overlay.notes ?? tour.notes,
    stops,
    seoTitle: overlay.seoTitle ?? tour.seoTitle,
    seoDescription: overlay.seoDescription ?? tour.seoDescription,
  };
}

/**
 * True when the tour is ready to be published in the given locale.
 * EN always returns true. Other locales require `ptReady === true`
 * (or the equivalent flag once we add more locales).
 */
export function isTourReady(tour: SignatureTour, locale: Locale): boolean {
  if (locale === DEFAULT_LOCALE) return true;
  const t = tour as LocalizableTour;
  if (locale === "pt") return t.ptReady === true;
  return false;
}
