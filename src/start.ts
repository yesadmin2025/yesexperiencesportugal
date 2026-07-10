import { createStart, createMiddleware } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { buildLegacyGoneResponse } from "@/lib/legacy-domain-redirect";
import {
  buildDisallowRobotsResponse,
  getRequestHost,
  shouldNoindexHost,
  withNoindexHeader,
} from "@/lib/noindex-nonprod-host";

/**
 * Server-side 410 Gone for the legacy domain (yesexperiences.pt).
 *
 * The previous 301 redirect to yesexperiencesportugal.com was removed
 * intentionally: we want the two domains treated as unrelated by search
 * engines so the deprecated Google Business Profile attached to the old
 * domain does NOT carry over to the canonical site.
 *
 * Logic lives in `@/lib/legacy-domain-redirect` so it can be unit-tested.
 * Only fires when the request actually reaches this server — the legacy
 * domain's DNS must point here for that to happen.
 */
const legacyDomainGone = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) return next();
  const gone = buildLegacyGoneResponse(request);
  if (gone) return gone;
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
  requestMiddleware: [legacyDomainGone, noindexNonProdHost],
  functionMiddleware: [attachSupabaseAuth],
}));
