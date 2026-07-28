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
 * Paths with a genuine, indexable page on BOTH sides (EN and PT).
 *
 * This is the hreflang + bilingual-sitemap allow-list. It deliberately
 * excludes `/faq`, `/moments` and `/proposals`: those are 301 redirect
 * stubs in both locales, and hreflang must never point at a redirect.
 * They stay in READY_PATHS so the language switcher keeps working.
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

