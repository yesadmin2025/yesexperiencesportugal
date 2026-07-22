/**
 * Registry of routes with published European Portuguese copy.
 *
 * Locale-neutral paths (NOT prefixed with `/pt`) listed here are
 * considered "PT ready". Used by LanguageSwitcher and the bilingual
 * sitemap + hreflang emitter.
 *
 * Rule: nothing lands here without human-reviewed European Portuguese
 * copy. No machine translation.
 */

const READY_PATHS = new Set<string>([
  "/",
  "/about",
  "/contact",
  "/cookies",
  "/corporate",
  "/day-tours",
  "/experiences",
  "/faq",
  "/moments",
  "/multi-day",
  "/portugal-travel-designer",
  "/privacy",
  "/proposal-in-portugal",
  "/proposals",
  "/reviews",
  "/studio-v3",
  "/terms",
  "/tours/arrabida-wine-allinclusive",
  "/tours/arrabida-boat",
  "/tours/tiles-workshop",
]);

export function isPtReady(path: string): boolean {
  return READY_PATHS.has(path === "" ? "/" : path);
}

export const PT_READY_PATHS: readonly string[] = Array.from(READY_PATHS);
