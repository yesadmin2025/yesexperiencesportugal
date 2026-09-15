/**
 * SPA page_view tracking.
 *
 * ROOT CAUSE (site side): the GTM container boots once on the initial
 * document load, so only that first pageview ever reached the dataLayer.
 * Every client-side route change in this TanStack SPA produced no
 * `page_view` at all — GA4 saw at most one hit per hard load.
 *
 * This hook pushes exactly one `page_view` per client-side navigation:
 *   • the initial load is intentionally skipped (gtm.js already fires it)
 *   • identical path+search within the same navigation is deduped
 *   • consent gating / PII strip / UTM enrichment come from trackEvent
 *   • admin, preview and local traffic are excluded upstream
 */

import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackEvent } from "@/lib/analytics-events";
import { sanitizeLocation } from "@/lib/url-sanitize";

export function usePageViewTracking(): void {
  const href = useRouterState({
    select: (s) => `${s.location.pathname}${s.location.searchStr ?? ""}`,
  });
  const last = useRef<string | null>(null);

  useEffect(() => {
    // First render = the hard load GTM already reported. Record and skip.
    if (last.current === null) {
      last.current = href;
      return;
    }
    if (last.current === href) return;
    last.current = href;
    // P0 privacy: never send the raw href/query string. Path + sanitized
    // query only; `page_location` is rebuilt from the origin + clean path.
    const { path, query } = sanitizeLocation(href);
    const qs = new URLSearchParams(query).toString();
    trackEvent("page_view", {
      page_path: qs ? `${path}?${qs}` : path,
      page_location:
        typeof window !== "undefined" ? `${window.location.origin}${path}` : undefined,
      page_title: typeof document !== "undefined" ? document.title : undefined,
    });
  }, [href]);
}
