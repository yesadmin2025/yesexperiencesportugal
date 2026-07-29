import { createStart, createMiddleware } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { buildLegacy301Response } from "@/lib/legacy-domain-redirect";
import {
  buildDisallowRobotsResponse,
  getRequestHost,
  shouldNoindexHost,
  withNoindexHeader,
} from "@/lib/noindex-nonprod-host";

/**
 * Hybrid legacy-domain handler for yesexperiences.pt.
 *
 * Per-path 301 to yesexperiencesportugal.com for every known WordPress URL
 * (see LEGACY_REDIRECT_MAP) so PageRank consolidates on the canonical
 * origin. Unmapped paths get 410 Gone — never a blanket homepage redirect
 * (that's the soft-404 trap).
 *
 * Deliberately paired with: no GSC Change of Address, and no reference
 * anywhere in the codebase to the deprecated Google Business Profile
 * attached to the old domain. That combination keeps the old GBP severed
 * while still transferring web-search authority.
 *
 * Logic lives in `@/lib/legacy-domain-redirect` so it can be unit-tested.
 */
const legacyDomainRedirect = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) return next();
  const response = buildLegacy301Response(request);
  if (response) return response;
  return next();
});

/**
 * De-index every non-canonical host.
 *
 * Applies to Lovable preview subdomains, the .lovable.app published URL,
 * localhost, and any third-party staging clone (e.g. the vendor stub at
 * yesexperiences.customwebsitedesigns.org) that ever gets pointed at this
 * origin. The canonical production domain is unaffected.
 *
 * Two effects:
 *   - `/robots.txt` returns `Disallow: /` (overrides `public/robots.txt`).
 *   - Every other response gets `X-Robots-Tag: noindex, nofollow`.
 *
 * See `@/lib/noindex-nonprod-host` for the host allow-list and rationale.
 */
const noindexNonProdHost = createMiddleware().server(async ({ next, request }) => {
  const host = getRequestHost(request);
  if (!shouldNoindexHost(host)) return next();

  const url = new URL(request.url);
  // Skip internal Lovable tooling routes.
  if (url.pathname.startsWith("/lovable/")) return next();

  if (url.pathname === "/robots.txt") return buildDisallowRobotsResponse();

  const result = await next();
  return { ...result, response: withNoindexHeader(result.response) };
});

/**
 * Normalise trailing-slash duplicates with a permanent 301.
 *
 * The hosting layer otherwise serves `/pt/` and `/contact/` with a 307
 * redirect to their no-slash canonicals, which Google Search Console
 * flags as a "Page with redirect" duplicate. A 301 tells crawlers the
 * canonical is permanent and consolidates signal on the no-slash URL.
 *
 * Rules: root `/` stays as-is; any other path ending in `/` (that isn't
 * an internal `/lovable/` tool route) 301s to the same path without the
 * trailing slash, preserving query + hash.
 */
const trailingSlashRedirect = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const { pathname } = url;
  if (pathname === "/" || !pathname.endsWith("/")) return next();
  if (pathname.startsWith("/lovable/")) return next();
  const target = pathname.replace(/\/+$/, "") + url.search + url.hash;
  return new Response(null, { status: 301, headers: { location: target } });
});

/**
 * Return a real 404 (no redirect chain) for any URL whose path contains a
 * literal `$paramName` (or its `%24paramName` encoding) segment.
 *
 * The hosting layer otherwise canonicalises these placeholder-looking
 * paths (e.g. `/local-stories/$tourId`) with a 307 to `.../undefined` or
 * `.../%24tourId`, producing a 307→404 chain that GSC flags as a
 * "Page with redirect" duplicate. Short-circuiting to 404 here keeps
 * the response single-hop.
 *
 * Legitimate slugs never start with `$`, so this is safe.
 */
const literalParamSegment404 = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) return next();
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    decoded = url.pathname;
  }
  // Match any segment that is exactly `$name` where name is [a-zA-Z_][a-zA-Z0-9_]*
  if (/\/\$[a-zA-Z_][a-zA-Z0-9_]*(?:\/|$)/.test(decoded)) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  }
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [
    legacyDomainRedirect,
    trailingSlashRedirect,
    literalParamSegment404,
    noindexNonProdHost,
  ],
  functionMiddleware: [attachSupabaseAuth],
}));
