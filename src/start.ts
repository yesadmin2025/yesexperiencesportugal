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

export const startInstance = createStart(() => ({
  requestMiddleware: [legacyDomainRedirect, noindexNonProdHost],
  functionMiddleware: [attachSupabaseAuth],
}));
