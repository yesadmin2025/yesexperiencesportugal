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
  "/privacy", // → /pt/privacy
  "/reviews", // → /pt/reviews
  "/terms", // → /pt/terms
]);

export function isPtReady(path: string): boolean {
  return READY_PATHS.has(path === "" ? "/" : path);
}

export const PT_READY_PATHS: readonly string[] = Array.from(READY_PATHS);
