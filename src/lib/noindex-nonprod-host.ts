/**
 * Non-production host guard.
 *
 * Any host that is NOT the canonical production domain
 * (yesexperiencesportugal.com / www.yesexperiencesportugal.com) must be
 * de-indexed. That includes:
 *   - Lovable preview subdomains (*.lovable.app, id-preview--*.lovable.app)
 *   - The published .lovable.app URL
 *   - Any third-party staging clone that ever gets pointed at this origin
 *     (e.g. yesexperiences.customwebsitedesigns.org)
 *   - Localhost / dev
 *
 * Two effects, both applied by `src/start.ts` request middleware:
 *   1. `/robots.txt` on non-prod hosts returns `Disallow: /` — overrides
 *      the static `public/robots.txt` (which is production's allow-all).
 *   2. Every other response on non-prod hosts gets an
 *      `X-Robots-Tag: noindex, nofollow` HTTP header — the strongest
 *      per-response signal, honoured even when a page has no `<meta robots>`.
 *
 * The legacy domain (yesexperiences.pt) is handled separately with a
 * 410 Gone response and is NOT treated by this module.
 */

export const CANONICAL_HOSTS: ReadonlySet<string> = new Set([
  "yesexperiencesportugal.com",
  "www.yesexperiencesportugal.com",
]);

/** Legacy hosts are handled by legacy-domain-redirect (410 Gone). Skip them here. */
const LEGACY_HOSTS: ReadonlySet<string> = new Set(["yesexperiences.pt", "www.yesexperiences.pt"]);

export function getRequestHost(request: Request): string {
  const url = new URL(request.url);
  return (request.headers.get("host") ?? url.host).toLowerCase().split(":")[0];
}

export function isCanonicalHost(host: string): boolean {
  return CANONICAL_HOSTS.has(host);
}

export function isLegacyHost(host: string): boolean {
  return LEGACY_HOSTS.has(host);
}

/**
 * True when the request should be de-indexed: everything that isn't the
 * canonical production domain and isn't the legacy 410 domain.
 */
export function shouldNoindexHost(host: string): boolean {
  if (isCanonicalHost(host)) return false;
  if (isLegacyHost(host)) return false;
  return true;
}

const DISALLOW_ROBOTS_BODY = `# Non-production host — de-indexed by default.
# Canonical production domain: https://yesexperiencesportugal.com
User-agent: *
Disallow: /
`;

/** Robots.txt body served on any non-prod host. */
export function buildDisallowRobotsResponse(): Response {
  return new Response(DISALLOW_ROBOTS_BODY, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

/**
 * Merge `X-Robots-Tag: noindex, nofollow` into an existing Response's headers
 * without clobbering anything else. Returns a new Response — Response headers
 * are immutable on some runtimes.
 */
export function withNoindexHeader(response: Response): Response {
  const headers = new Headers(response.headers);
  // If a stronger directive is already set (e.g. from the legacy 410), keep it.
  if (!headers.has("x-robots-tag")) {
    headers.set("x-robots-tag", "noindex, nofollow");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
