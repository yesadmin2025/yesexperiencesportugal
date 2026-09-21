import brandSocialImage from "@/assets/hero-coast.jpg";

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


/**
 * Shared branded social-preview image — the canonical homepage coast
 * poster already used by the site. Absolute in rendered HTML because the
 * bundler-resolved asset path is prefixed with SITE_URL.
 */
export const BRAND_SOCIAL_IMAGE = abs(brandSocialImage);

export const BRAND_SOCIAL_IMAGE_ALT =
  "YES experiences Portugal — the Portuguese Atlantic coast";

/**
 * og:image + twitter:image meta entries for a route.
 *
 * Pass a route-specific image (a bundled asset import or an absolute
 * URL) when the page shows one; omit it to fall back to the shared
 * branded poster. Emit these ONCE per route — never alongside
 * hand-written og:image tags, which would duplicate the property.
 */
export function socialImageMeta(image?: string, alt?: string) {
  const url = abs(image || brandSocialImage);
  const imageAlt = alt || BRAND_SOCIAL_IMAGE_ALT;
  return [
    { property: "og:image", content: url },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:image", content: url },
    { name: "twitter:image:alt", content: imageAlt },
  ] as const;
}
