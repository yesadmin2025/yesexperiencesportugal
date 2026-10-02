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

/**
 * GA4 "Page changes based on browser history events" (enhanced measurement on
 * the G-9LPHHSEFW6 stream) already sends one page_view per SPA route change —
 * verified in a browser: it produced a page_view even where site code sends
 * nothing. Sending our own as well double-counted every navigation, so the
 * site no longer emits route-change page_views. If that GA4 setting is ever
 * switched off, flip this flag back to true.
 */
export const SITE_SENDS_SPA_PAGE_VIEW = false;

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
    if (!SITE_SENDS_SPA_PAGE_VIEW) return;
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
