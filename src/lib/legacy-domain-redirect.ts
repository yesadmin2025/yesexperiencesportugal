/**
 * Legacy domain handler.
 *
 * Historical note: this module used to issue a 301 redirect from the legacy
 * `yesexperiences.pt` domain to the canonical `yesexperiencesportugal.com`.
 * That redirect was intentionally REMOVED so search engines treat the two
 * domains as unrelated entities. A 301 tells Google "these are the same
 * thing — transfer authority and associations" which, in this project's
 * case, also strengthens the link to the deprecated Google Business
 * Profile attached to the old domain. We don't want that.
 *
 * Instead we now respond with **HTTP 410 Gone** on every legacy host
 * request. 410 is the strongest "this content is permanently gone, do not
 * look for a replacement" signal in HTTP — stronger than 404. Google will
 * de-index the legacy URLs and stop attributing their associations to the
 * canonical domain.
 *
 * Pure logic is kept here so it can be unit-tested independently of the
 * TanStack Start middleware runtime.
 */

export const CANONICAL_ORIGIN = "https://yesexperiencesportugal.com";

export const LEGACY_HOSTS: ReadonlySet<string> = new Set([
  "yesexperiences.pt",
  "www.yesexperiences.pt",
]);

const GONE_BODY = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="robots" content="noindex,nofollow" />
  <title>410 Gone</title>
</head>
<body>
  <h1>410 Gone</h1>
  <p>This domain is no longer in service.</p>
</body>
</html>`;

/**
 * Given a Request, returns a 410 Gone Response if the Host header (or URL
 * host) matches a legacy host. Otherwise returns null and the caller should
 * continue normal handling.
 *
 * Intentionally does NOT set a Location header — we don't want crawlers to
 * follow back to the canonical domain. Host match is case-insensitive.
 */
export function buildLegacyGoneResponse(request: Request): Response | null {
  try {
    const url = new URL(request.url);
    const host = (request.headers.get("host") ?? url.host).toLowerCase();
    if (!LEGACY_HOSTS.has(host)) return null;
    return new Response(GONE_BODY, {
      status: 410,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  } catch {
    return null;
  }
}

/**
 * Back-compat alias. Prefer `buildLegacyGoneResponse` in new code.
 * @deprecated The legacy domain no longer 301-redirects; this returns 410 Gone.
 */
export const buildLegacyRedirectResponse = buildLegacyGoneResponse;
