import { createStart, createMiddleware } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const CANONICAL_ORIGIN = "https://yesexperiencesportugal.com";

// Hostnames that must be 301-redirected to the canonical domain.
// Match is case-insensitive and includes optional `www.` prefix.
const LEGACY_HOSTS = new Set([
  "yesexperiences.pt",
  "www.yesexperiences.pt",
]);

/**
 * Server-side 301 redirect from the legacy domain (yesexperiences.pt)
 * to the canonical domain (yesexperiencesportugal.com).
 *
 * Preserves the request path and query string exactly.
 * Only fires when the request actually hits this server — for that to happen
 * the legacy domain's DNS / custom-domain config must point here.
 */
const legacyDomainRedirect = createMiddleware().server(async ({ next, request }) => {
  try {
    const url = new URL(request.url);
    const host = (request.headers.get("host") ?? url.host).toLowerCase();
    if (LEGACY_HOSTS.has(host)) {
      const target = `${CANONICAL_ORIGIN}${url.pathname}${url.search}`;
      return new Response(null, {
        status: 301,
        headers: {
          location: target,
          "cache-control": "public, max-age=3600",
        },
      });
    }
  } catch {
    // fall through to normal handling
  }
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [legacyDomainRedirect],
  functionMiddleware: [attachSupabaseAuth],
}));
