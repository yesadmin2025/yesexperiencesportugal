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
 * Human-friendly landing served with a 410 status.
 *
 * The status code is what search engines act on — the body is invisible to
 * de-indexation logic. So we can safely ship a branded page for humans
 * that click a link to the retired domain, without weakening the "gone
 * forever" signal to crawlers.
 *
 * Rules we KEEP for the SEO decoupling:
 *   - HTTP status stays 410 (see file header).
 *   - No `<link rel="canonical">` pointing at the new domain (would
 *     re-associate the two properties in Google's index).
 *   - `noindex,nofollow` in meta AND `X-Robots-Tag` header.
 *   - No `Location` header (see `buildLegacyGoneResponse`).
 *
 * Rules we ADD for humans:
 *   - Clear message ("we moved") in EN + PT.
 *   - Prominent link to `https://yesexperiencesportugal.com/` — plain
 *     anchor, not a meta refresh, so crawlers see it as a normal outbound
 *     link and NOT as a redirect target.
 */
const GONE_BODY = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>YES Experiences Portugal has moved</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: #FAF8F3;
      color: #2E2E2E;
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
      border: 1px solid #E9E2D2;
      border-radius: 12px;
      padding: 40px 28px;
      text-align: center;
      box-shadow: 0 12px 40px -24px rgba(46, 46, 46, 0.25);
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #C9A96A;
      margin-bottom: 18px;
    }
    h1 {
      font-family: "Georgia", "Times New Roman", serif;
      font-weight: 400;
      font-size: 28px;
      color: #295B61;
      margin: 0 0 14px;
      line-height: 1.2;
    }
    h1 em { font-style: italic; }
    p { font-size: 15px; margin: 0 0 14px; color: #2E2E2E; }
    p.pt { color: #6b6b6b; font-size: 13.5px; }
    a.cta {
      display: inline-block;
      margin-top: 18px;
      padding: 14px 26px;
      background: #295B61;
      color: #ffffff;
      text-decoration: none;
      border-radius: 999px;
      font-weight: 500;
      font-size: 14px;
      letter-spacing: 0.02em;
    }
    a.cta:hover { background: #1f4a4f; }
    .footnote {
      margin-top: 26px;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #9a9a9a;
    }
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">YES Experiences Portugal</div>
    <h1>We've <em>moved</em></h1>
    <p>Our new home is <strong>yesexperiencesportugal.com</strong>. Same team, new site, updated experiences across Portugal.</p>
    <p class="pt">Mudámos de casa. Visita-nos em <strong>yesexperiencesportugal.com</strong>.</p>
    <a class="cta" href="${CANONICAL_ORIGIN}/" rel="nofollow">Visit the new site →</a>
    <div class="footnote">HTTP 410 · This domain has been retired</div>
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
