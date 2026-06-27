import { createStart, createMiddleware } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { buildLegacyGoneResponse } from "@/lib/legacy-domain-redirect";

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

export const startInstance = createStart(() => ({
  requestMiddleware: [legacyDomainGone],
  functionMiddleware: [attachSupabaseAuth],
}));
