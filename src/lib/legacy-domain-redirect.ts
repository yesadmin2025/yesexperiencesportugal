/**
 * Pure logic for the legacy-domain 301 redirect.
 * Extracted so it can be unit-tested independently of the
 * TanStack Start middleware runtime.
 */

export const CANONICAL_ORIGIN = "https://yesexperiencesportugal.com";

export const LEGACY_HOSTS: ReadonlySet<string> = new Set([
  "yesexperiences.pt",
  "www.yesexperiences.pt",
]);

/**
 * Given a Request, returns a 301 Response to the canonical origin if the
 * Host header (or URL host) matches a legacy host. Otherwise returns null
 * and the caller should continue normal handling.
 *
 * Path and query string are preserved exactly. Host match is
 * case-insensitive.
 */
export function buildLegacyRedirectResponse(request: Request): Response | null {
  try {
    const url = new URL(request.url);
    const host = (request.headers.get("host") ?? url.host).toLowerCase();
    if (!LEGACY_HOSTS.has(host)) return null;
    const target = `${CANONICAL_ORIGIN}${url.pathname}${url.search}`;
    return new Response(null, {
      status: 301,
      headers: {
        location: target,
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return null;
  }
}
