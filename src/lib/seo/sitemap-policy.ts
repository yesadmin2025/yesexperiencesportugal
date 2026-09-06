/**
 * Sitemap index-quality policy — single source of truth shared by the
 * `/sitemap.xml` route and the SEO regression tests.
 *
 * Portuguese twins are still bilingual, hreflang-paired pages (PT_PAIRED_PATHS
 * stays the source of truth for that), but utility pages that are
 * intentionally `noindex, follow` must never be advertised in the sitemap:
 * Google reports them as "crawled – currently not indexed" / soft-404 noise
 * and they dilute the crawl budget of the pages that convert.
 *
 * EN `/contact` stays indexable (substantial lead-gen page); only its PT twin
 * is noindex. `/reviews` and `/pt/reviews` are first-party review pages and
 * remain indexable in both languages.
 */

/** EN paths whose PT twin is `noindex, follow` and excluded from sitemap.xml. */
export const PT_NOINDEX_UTILITY_PATHS: ReadonlySet<string> = new Set([
  "/contact",
  "/privacy",
  "/cookies",
]);

/** Map a paired EN path to its Portuguese URL. */
export function toPtPath(enPath: string): string {
  return enPath === "/" ? "/pt" : `/pt${enPath}`;
}

/** Portuguese sitemap paths: every paired page except the noindex utilities. */
export function ptSitemapPaths(pairedPaths: readonly string[]): string[] {
  return pairedPaths.filter((p) => !PT_NOINDEX_UTILITY_PATHS.has(p)).map(toPtPath);
}
