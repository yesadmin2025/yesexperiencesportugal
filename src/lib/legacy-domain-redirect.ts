/**
 * Legacy domain handler — HYBRID policy (301 + 410).
 *
 * Strategy (approved 2026-07-10, keep live ≥ 2027-07-10):
 *   - Per-path **301** for every known legacy WordPress URL → closest
 *     equivalent on `yesexperiencesportugal.com`. Consolidates PageRank
 *     from inbound links accumulated on the old domain.
 *   - **410 Gone** for everything else on the legacy host. No blanket
 *     homepage redirect — that produces soft-404s and dilutes equity.
 *   - **No** GSC Change of Address, **no** reference anywhere in the
 *     codebase to the old Google Business Profile (place ID, CID, NAP
 *     from the WP site). CoA is the single strongest signal that would
 *     re-associate the deprecated GBP with the new domain; skipping it
 *     is what makes this policy "hybrid" instead of a full migration.
 *
 * Do NOT remove the 301 map before 2027-07-10.
 *
 * Pure logic lives here so it can be unit-tested independently of the
 * TanStack Start middleware runtime.
 */

export const CANONICAL_ORIGIN = "https://yesexperiencesportugal.com";

export const LEGACY_HOSTS: ReadonlySet<string> = new Set([
  "yesexperiences.pt",
  "www.yesexperiences.pt",
]);

/**
 * Exact old-path → new-path 1:1 mapping.
 *
 * Keys are normalized: lowercase, no trailing slash (except "/"), no query.
 * Values are canonical-site paths starting with "/".
 *
 * `/tour/<slug>` entries map to `/tours/<signature-id>` (or the nearest
 * Signature when no exact equivalent exists). Fallback rules encoded as
 * explicit entries so every URL returns a real 301, not a regex catch-all.
 *
 * When new WP slugs surface in Search Console's "Not found (404)" report,
 * add them here — don't wildcard.
 */
export const LEGACY_REDIRECT_MAP: Readonly<Record<string, string>> = {
  // Root
  "/": "/",

  // Core pages
  "/about": "/about",
  "/about-us": "/about",
  "/contact": "/contact",
  "/contact-us": "/contact",
  "/faq": "/faq",
  "/faqs": "/faq",

  // Hubs
  "/tours": "/experiences",
  "/experiences": "/experiences",
  "/day-tours": "/day-tours",
  "/multi-day": "/multi-day",
  "/private-tours": "/private-tours-portugal",
  "/luxury-tours": "/luxury-tours-portugal",

  // Blog → Local Stories hub. Individual posts get added case-by-case
  // as they surface in Search Console.
  "/blog": "/local-stories",

  // Commercial pages
  "/proposal": "/proposal-in-portugal",
  "/proposals": "/proposal-in-portugal",
  "/corporate": "/corporate",
  "/press": "/press",

  // Legal
  "/privacy": "/privacy",
  "/privacy-policy": "/privacy",
  "/terms": "/terms",
  "/terms-and-conditions": "/terms",
  "/cookies": "/cookies",

  // /tour/<slug> — exact matches to current Signature IDs
  "/tour/arrabida-wine-allinclusive": "/tours/arrabida-wine-allinclusive",
  "/tour/arrabida-wine-tour": "/tours/arrabida-wine-allinclusive",
  "/tour/arrabida-wine": "/tours/arrabida-wine-allinclusive",
  "/tour/setubal-wine-tour": "/tours/arrabida-wine-allinclusive",
  "/tour/azeitao-wine-tour": "/tours/arrabida-wine-allinclusive",
  "/tour/azeitao-cheese": "/tours/azeitao-cheese",
  "/tour/wild-beaches-picnic": "/tours/wild-beaches-picnic",
  "/tour/arrabida-boat": "/tours/arrabida-boat",
  "/tour/arrabida-boat-tour": "/tours/arrabida-boat",
  "/tour/tiles-workshop": "/tours/tiles-workshop",
  "/tour/sintra-cascais": "/tours/sintra-cascais",
  "/tour/sintra-tour": "/tours/sintra-cascais",
  "/tour/sintra-day-trip": "/tours/sintra-cascais",
  "/tour/cascais-tour": "/tours/sintra-cascais",
  "/tour/troia-comporta": "/tours/troia-comporta",
  "/tour/comporta-tour": "/tours/troia-comporta",
  "/tour/comporta-day-trip": "/tours/troia-comporta",
  "/tour/evora-alentejo": "/tours/evora-alentejo",
  "/tour/evora-tour": "/tours/evora-alentejo",
  "/tour/alentejo-wine-tour": "/tours/evora-alentejo",
  "/tour/tomar-coimbra": "/tours/tomar-coimbra",
  "/tour/fatima-nazare-obidos": "/tours/fatima-nazare-obidos",
  "/tour/fatima-tour": "/tours/fatima-nazare-obidos",
  "/tour/nazare-tour": "/tours/fatima-nazare-obidos",
  "/tour/obidos-tour": "/tours/fatima-nazare-obidos",
  "/tour/roman-heritage-alentejo": "/tours/roman-heritage-alentejo",
  "/tour/southwest-vicentine-coast": "/tours/southwest-vicentine-coast",
  "/tour/vicentine-coast": "/tours/southwest-vicentine-coast",
};

/**
 * 410 Gone body — served for legacy-host requests that don't match the map.
 * Intentionally generic: no brand name, no NAP, no canonical link, no
 * structured data. See file header for why.
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
    h1 { font-size: 24px; font-weight: 600; color: #444; margin: 0 0 14px; line-height: 1.2; }
    p { font-size: 15px; margin: 0 0 12px; color: #555; }
    p.pt { color: #777; font-size: 13.5px; }
    .footnote { margin-top: 24px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #999; }
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

/** Normalize a pathname for map lookup: lowercase, strip trailing slash (keep "/"). */
function normalizePath(pathname: string): string {
  const lower = pathname.toLowerCase();
  if (lower === "/" || lower === "") return "/";
  return lower.endsWith("/") ? lower.slice(0, -1) : lower;
}

/**
 * If the request is on a legacy host, return either:
 *   - a 301 to the canonical equivalent (preserving query string), or
 *   - a 410 Gone response for unmapped paths.
 * Otherwise return null and the caller should continue normal handling.
 */
export function buildLegacy301Response(request: Request): Response | null {
  try {
    const url = new URL(request.url);
    const host = (request.headers.get("host") ?? url.host).toLowerCase();
    if (!LEGACY_HOSTS.has(host)) return null;

    const key = normalizePath(url.pathname);
    const target = LEGACY_REDIRECT_MAP[key];

    if (target) {
      const location = `${CANONICAL_ORIGIN}${target}${url.search}`;
      return new Response(null, {
        status: 301,
        headers: {
          location,
          "cache-control": "public, max-age=86400",
          // Belt-and-braces: tell crawlers the legacy URL itself is not to
          // be indexed while it drops out of the index. The 301 target is
          // fully indexable on the canonical origin.
          "x-robots-tag": "noindex",
        },
      });
    }

    // Unmapped legacy path — 410 Gone, no Location header.
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
 * Back-compat alias so `src/start.ts` and existing tests keep working.
 * Prefer `buildLegacy301Response` in new code.
 */
export const buildLegacyGoneResponse = buildLegacy301Response;
export const buildLegacyRedirectResponse = buildLegacy301Response;
