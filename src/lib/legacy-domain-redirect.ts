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

/**
 * Retired-domain landing served with a 410 status.
 *
 * The status code is what search engines act on — the body is invisible to
 * de-indexation logic. This page is intentionally generic and contains no
 * brand name, NAP (name/address/phone), or canonical link to the current
 * site, so it cannot reinforce any existing Google Business Profile
 * association.
 *
 * Rules we KEEP for the SEO decoupling:
 *   - HTTP status stays 410 (see file header).
 *   - No `<link rel="canonical">` pointing at the new domain (would
 *     re-associate the two properties in Google's index).
 *   - `noindex,nofollow` in meta AND `X-Robots-Tag` header.
 *   - No `Location` header (see `buildLegacyGoneResponse`).
 *   - No brand name, logo, or structured data in the body.
 */
const GONE_BODY = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>This web address has been retired</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      line-height: 1.55;
    }
    main {
      max-width: 520px;
      width: 100%;
      background: #ffffff;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 40px 28px;
      text-align: center;
      box-shadow: 0 12px 40px -24px rgba(0, 0, 0, 0.15);
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #444;
      margin: 0 0 14px;
      line-height: 1.2;
    }
    p { font-size: 15px; margin: 0 0 12px; color: #555; }
    p.pt { color: #777; font-size: 13.5px; }
    .footnote {
      margin-top: 24px;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #999;
    }
  </style>
</head>
<body>
  <main>
    <h1>This web address has been retired</h1>
    <p>The page you are looking for is no longer available at this address.</p>
    <p class="pt">A página que procura já não está disponível neste endereço.</p>
    <div class="footnote">HTTP 410 · Domain retired</div>
  </main>
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
