import { createStart, createMiddleware } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { buildLegacyRedirectResponse } from "@/lib/legacy-domain-redirect";

/**
 * Server-side 301 redirect from the legacy domain (yesexperiences.pt)
 * to the canonical domain (yesexperiencesportugal.com).
 *
 * Logic lives in `@/lib/legacy-domain-redirect` so it can be unit-tested.
 * Only fires when the request actually reaches this server — the legacy
 * domain's DNS must point here for that to happen.
 */
const legacyDomainRedirect = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) return next();
  const redirect = buildLegacyRedirectResponse(request);
  if (redirect) return redirect;
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [legacyDomainRedirect],
  functionMiddleware: [attachSupabaseAuth],
}));
