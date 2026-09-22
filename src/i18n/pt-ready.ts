/**
 * Registry of routes with published European Portuguese copy.
 *
 * Locale-neutral paths (NOT prefixed with `/pt`) listed here are
 * considered "PT ready". Used by LanguageSwitcher and (Phase 4)
 * the bilingual sitemap + hreflang emitter.
 *
 * Rule: nothing lands here without human-reviewed European Portuguese
 * copy. No machine translation.
 */

const READY_PATHS = new Set<string>([
  "/", // → /pt
  "/about", // → /pt/about
  "/contact", // → /pt/contact
  "/cookies", // → /pt/cookies
  "/corporate", // → /pt/corporate
  "/day-tours", // → /pt/day-tours
  "/experiences", // → /pt/experiences
  "/faq", // → /pt/faq (redirect stub, mirrors EN)
  "/moments", // → /pt/moments (redirect stub, mirrors EN)
  "/privacy", // → /pt/privacy
  "/proposals", // → /pt/proposals (redirect stub, mirrors EN)
  "/reviews", // → /pt/reviews
  "/terms", // → /pt/terms
]);

export function isPtReady(path: string): boolean {
  return READY_PATHS.has(path === "" ? "/" : path);
}

export const PT_READY_PATHS: readonly string[] = Array.from(READY_PATHS);

/**
 * Locale paths that are 301 redirect stubs, mapped to their final page.
 *
 * The language switcher must send a reader straight to real content instead of
 * through a permanent redirect. Hreflang/sitemap policy is unaffected: those
 * already exclude every stub via `PAIRED`.
 */
const LOCALE_STUB_DESTINATIONS: Record<string, string> = {
  "/moments": "/proposal-in-portugal",
  "/pt/faq": "/pt/about",
  "/pt/moments": "/pt/contact",
  "/pt/proposals": "/pt/contact",
};

/** Final destination for a locale path, resolving 301 stubs in one hop. */
export function resolveLocalePath(path: string): string {
  return LOCALE_STUB_DESTINATIONS[path] ?? path;
}

/**
 * Paths with a genuine page on BOTH sides (EN and PT).
 *
 * This is the locale-pair allow-list used for hreflang/sitemap policy.
 * Privacy/cookie twins are genuine pages but intentionally noindex, so
 * `ptSitemapPaths()` removes them from sitemap.xml. It deliberately excludes
 * `/faq`, `/moments` and `/proposals`: those are 301 redirect stubs in
 * both locales, and hreflang must never point at a redirect. They stay in
 * READY_PATHS so the language switcher keeps working.
 */
const PAIRED = new Set<string>([
  "/",
  "/about",
  "/contact",
  "/cookies",
  "/corporate",
  "/day-tours",
  "/experiences",
  "/privacy",
  "/reviews",
  "/terms",
]);

export function isPtPaired(path: string): boolean {
  return PAIRED.has(path === "" ? "/" : path);
}

export const PT_PAIRED_PATHS: readonly string[] = Array.from(PAIRED);
