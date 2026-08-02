/**
 * Analytics primitive — thin, GTM-ready, SSR/test-safe.
 *
 * All analytics events across the site funnel through `track()`. It
 * pushes into `window.dataLayer` (GTM contract) and, when present,
 * calls `window.gtag('event', ...)` as a redundant channel.
 *
 * Design goals:
 *   - Zero hard dependency on GTM being installed. If dataLayer does
 *     not exist yet, we create it — GTM will consume it retroactively
 *     once the container script boots.
 *   - Never throws. Never blocks. Never runs during SSR or tests.
 *   - Typed event catalogue so call sites cannot drift.
 *   - Global click delegator (`installAnalyticsAttrs`) auto-fires
 *     events for any element with `data-analytics="event_name"`.
 *     Extra `data-analytics-<param>` attributes become event params.
 *
 * Wire the click delegator once at app boot (see src/router.tsx or
 * a client-only effect in the root route).
 */

import { isTrackingDisabled } from "@/lib/analytics-exclusions";

export type AnalyticsEvent =
  | "hero_open_studio_click"
  | "hero_choose_experience_click"
  | "five_ways_signature_click"
  | "five_ways_studio_click"
  | "five_ways_moments_click"
  | "five_ways_corporate_click"
  | "five_ways_travel_designer_click"
  | "studio_start_click"
  | "studio_step_complete"
  | "studio_continue_draft_click"
  | "signature_reserve_click"
  | "signature_tailor_click"
  | "review_source_click"
  | "whatsapp_click"
  | "email_click"
  | "local_story_cta_click"
  | "checkout_view"
  | "checkout_started"
  | "payment_success";

export interface AnalyticsParams {
  page_type?: string;
  placement?: string;
  item_slug?: string;
  experience_slug?: string;
  story_slug?: string;
  card_type?: string;
  device?: "mobile" | "tablet" | "desktop";
  value?: number;
  currency?: string;
  source?: string;
  [key: string]: unknown;
}

type GtagFn = (command: "event", name: string, params?: Record<string, unknown>) => void;

interface AnalyticsWindow extends Window {
  dataLayer?: Array<Record<string, unknown>>;
  gtag?: GtagFn;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function isTest(): boolean {
  return typeof process !== "undefined" && !!process.env?.VITEST;
}

function inferDevice(): AnalyticsParams["device"] {
  if (!isBrowser()) return undefined;
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/**
 * Fire an analytics event. Safe to call from anywhere.
 */
export function track(event: AnalyticsEvent | string, params: AnalyticsParams = {}): void {
  if (!isBrowser() || isTest() || isTrackingDisabled()) return;
  const w = window as AnalyticsWindow;
  const enriched: Record<string, unknown> = {
    event,
    device: params.device ?? inferDevice(),
    page_type: params.page_type,
    ...params,
    _ts: Date.now(),
  };
  try {
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push(enriched);
  } catch {
    /* silent */
  }
  try {
    if (typeof w.gtag === "function") {
      const { event: _e, ...rest } = enriched;
      w.gtag("event", event, rest);
    }
  } catch {
    /* silent */
  }
}

/**
 * Install a single delegated click listener that reads
 * `data-analytics="event_name"` (and `data-analytics-*` attrs as
 * params) off the closest ancestor and calls `track()`. Idempotent.
 */
let installed = false;
export function installAnalyticsAttrs(): void {
  if (!isBrowser() || isTest() || installed) return;
  if (isTrackingDisabled()) return;
  installed = true;

  const handler = (ev: MouseEvent) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;

    // Auto-track outbound review links + tel: / mailto: without needing data attrs.
    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (anchor && !anchor.dataset.analytics) {
      const href = anchor.getAttribute("href") ?? "";
      const auto = detectAutoEvent(href);
      if (auto) {
        void import("@/lib/analytics-events").then((m) =>
          m.trackEvent(auto, {
            placement: anchor.dataset.analyticsPlacement ?? inferPlacement(anchor),
          }),
        );
      }
    }

    const el = target.closest<HTMLElement>("[data-analytics]");
    if (!el) return;
    const event = el.dataset.analytics;
    if (!event) return;
    const params: AnalyticsParams = {};
    for (const [key, value] of Object.entries(el.dataset)) {
      if (key === "analytics" || !key.startsWith("analytics")) continue;
      const param = key.slice("analytics".length);
      const paramKey = param.charAt(0).toLowerCase() + param.slice(1);
      params[paramKey] = value;
    }
    // Route declarative clicks through the canonical wrapper for consent + dedupe + PII strip.
    void import("@/lib/analytics-events").then((m) =>
      m.trackEvent(event as never, params as never),
    );
    // GA4 generate_lead — any WhatsApp click across the site is a lead.
    if (event === "whatsapp_click") {
      void import("@/lib/analytics-ga4").then((m) =>
        m.gaGenerateLead({
          leadSource:
            typeof params.placement === "string" && params.placement.length > 0
              ? String(params.placement)
              : "whatsapp",
          method: "whatsapp",
        }),
      );
    }
  };

  document.addEventListener("click", handler, { capture: true, passive: true });
}

function detectAutoEvent(
  href: string,
): "phone_click" | "email_click" | "tripadvisor_click" | "google_reviews_click" | null {
  if (href.startsWith("tel:")) return "phone_click";
  if (href.startsWith("mailto:")) return "email_click";
  try {
    const base = isBrowser() ? window.location.href : "https://example.com";
    const u = new URL(href, base);
    const host = u.hostname.toLowerCase();
    if (host.endsWith("tripadvisor.com") || host.endsWith("tripadvisor.pt")) {
      return "tripadvisor_click";
    }
    if (host.endsWith("google.com") || host.endsWith("google.pt")) {
      if (
        u.pathname.startsWith("/search") ||
        u.pathname.startsWith("/maps") ||
        u.pathname.includes("/reviews")
      ) {
        return "google_reviews_click";
      }
    }
  } catch {
    /* not a URL */
  }
  return null;
}

function inferPlacement(el: Element): string {
  const section = el.closest<HTMLElement>("[data-section], section");
  return section?.dataset?.section ?? section?.id ?? "unknown";
}
