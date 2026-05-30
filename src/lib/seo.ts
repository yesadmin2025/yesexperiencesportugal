/**
 * SEO helpers — canonical site URL and absolute-URL builder.
 *
 * Use `SITE_URL` as the single source of truth for the project's
 * canonical domain. Use `abs(path)` to turn a relative path or an
 * imported asset URL (e.g. `/assets/hero-abc123.jpg`) into an
 * absolute URL suitable for `og:image`, `twitter:image`,
 * `og:url`, `canonical` links, and `sitemap.xml` entries.
 */
export const SITE_URL = "https://yesexperiencesportugal.com";

export function abs(pathOrUrl: string): string {
  if (!pathOrUrl) return SITE_URL;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path}`;
}

/** Build the canonical+og:url meta/link entries for a given route path. */
export function canonicalFor(path: string) {
  const url = abs(path);
  return {
    meta: { property: "og:url", content: url } as const,
    link: { rel: "canonical", href: url } as const,
  };
}
