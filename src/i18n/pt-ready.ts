/**
 * Registry of routes with published European Portuguese copy.
 *
 * Any locale-neutral path (i.e. NOT prefixed with `/pt`) listed here is
 * considered "PT ready". The LanguageSwitcher and the future bilingual
 * sitemap use this list to decide whether to surface a PT alternate.
 *
 * Rule: nothing lands here without human-authored European Portuguese
 * copy that has been reviewed. Machine translation is not allowed.
 *
 * Phase 3 starts with the PT landing page (`/`), which resolves to
 * `/pt` and gets bilingual chrome (nav / footer / CTAs / cookies /
 * 404). Per-route PT copy (homepage body, tours, forms, emails, etc.)
 * ships in subsequent turns, each adding entries here.
 */

const READY_PATHS = new Set<string>([
  "/", // homepage → /pt landing (chrome-only PT for now)
]);

/**
 * Whether a locale-neutral path has PT copy ready.
 * `path` should already be locale-stripped (see parseLocaleFromPath).
 */
export function isPtReady(path: string): boolean {
  return READY_PATHS.has(path === "" ? "/" : path);
}

export const PT_READY_PATHS: readonly string[] = Array.from(READY_PATHS);
