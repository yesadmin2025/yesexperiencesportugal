/**
 * Canonical analytics event catalogue for YES Experiences Portugal.
 *
 * Single entry point (`trackEvent`) for every custom GA4/GTM event.
 * Wraps the lower-level `track()` in `analytics.ts` and adds:
 *   • auto-enrichment (page_path, language, device, utm_*)
 *   • PII strip (email/phone/name/message never reach GA4)
 *   • dedupe (same event+experience+placement within 800ms is dropped)
 *   • consent gating (queue while Consent Mode = denied, flush on grant)
 *
 * GA4 ecommerce events (view_item, add_to_cart, purchase, …) continue
 * to live in `analytics-ga4.ts`. Custom brand + funnel events live here.
 */

import { track, type AnalyticsParams } from "@/lib/analytics";
import { utmParams } from "@/lib/utm";
import { isTrackingDisabled } from "@/lib/analytics-exclusions";

/* ─────────────────── Event catalogue (exact names) ─────────────────── */

export type YesAnalyticsEvent =
  // Lifecycle
  | "page_view"
  // Homepage
  | "hero_open_studio"
  | "hero_choose_experience"
  | "five_ways_signature_click"
  | "five_ways_studio_click"
  | "five_ways_moments_click"
  | "five_ways_corporate_click"
  | "five_ways_travel_designer_click"
  // Signature
  | "signature_card_view"
  | "signature_reserve_click"
  | "signature_tailor_click"
  | "availability_open"
  | "date_selected"
  | "participants_selected"
  | "checkout_started"
  | "checkout_completed"
  // Studio
  | "studio_started"
  | "studio_step_completed"
  | "studio_option_added"
  | "studio_option_removed"
  | "studio_draft_resumed"
  | "studio_checkout_started"
  | "studio_checkout_completed"
  | "studio_abandoned"
  // Studio V3 funnel (mirrored from studio-v3-funnel trackStep)
  | "studio_phase_view"
  | "studio_choice_selected"
  | "studio_back_navigation"
  | "studio_story_reveal_viewed"
  | "studio_price_expanded"
  | "studio_guest_details_started"
  | "studio_abandon_by_phase"
  // Lead gen
  | "whatsapp_click"
  | "contact_form_started"
  | "contact_form_submitted"
  | "moments_lead"
  | "corporate_lead"
  | "travel_designer_lead"
  // Trade (B2B)
  | "trade_access_click"
  | "trade_email_click"
  | "trade_whatsapp_click"
  | "sample_journey_view"
  | "travel_book_sample_request"
  | "trade_faq_open"
  | "trade_form_started"
  | "trade_form_submitted"
  | "trade_form_error"
  // Corporate
  | "corporate_hero_proposal_click"
  | "corporate_whatsapp_click"
  | "corporate_format_view"
  | "corporate_faq_open"
  | "corporate_form_started"
  | "corporate_form_submitted"
  | "corporate_form_error"
  | "corporate_signature_click"
  | "corporate_travel_designer_click"
  // Other
  | "language_changed"
  | "currency_changed"
  | "consent_choice"
  | "tripadvisor_click"
  | "google_reviews_click"
  | "phone_click"
  | "email_click";

export type ExperienceType =
  | "signature"
  | "studio"
  | "tailor"
  | "moments"
  | "corporate"
  | "travel_designer";

export interface YesEventParams {
  page_path?: string;
  language?: string;
  experience_id?: string | null;
  experience_type?: ExperienceType;
  group_size?: number;
  placement?: string;
  source?: string;
  value?: number;
  currency?: string;
  [key: string]: unknown;
}

/* ─────────────────── PII strip ─────────────────── */

const PII_KEYS = new Set([
  "email",
  "e_mail",
  "phone",
  "tel",
  "telephone",
  "name",
  "full_name",
  "given_name",
  "given-name",
  "family_name",
  "family-name",
  "message",
  "notes",
  "address",
  "user_id",
  "customer_email",
]);

function stripPii(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (PII_KEYS.has(k.toLowerCase())) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
        console.warn(`[analytics] dropped PII key '${k}' from event`);
      }
      continue;
    }
    out[k] = v;
  }
  return out;
}

/* ─────────────────── Locale registry ─────────────────── */

let currentLocale: string | null = null;
export function setAnalyticsLocale(locale: string): void {
  currentLocale = locale;
}

/* ─────────────────── Consent (Google Consent Mode v2) ─────────────────── */

type ConsentState = "granted" | "denied" | "unknown";
let consentState: ConsentState = "unknown";

interface QueuedEvent {
  name: string;
  params: Record<string, unknown>;
}
const pendingQueue: QueuedEvent[] = [];

export function setAnalyticsConsent(state: "granted" | "denied"): void {
  consentState = state;
  if (state === "granted") flushQueue();
}

function flushQueue(): void {
  while (pendingQueue.length > 0) {
    const q = pendingQueue.shift();
    if (q) track(q.name, q.params as AnalyticsParams);
  }
}

/* ─────────────────── Dedupe ─────────────────── */

const DEDUPE_MS = 800;
const lastFire = new Map<string, number>();

function dedupeKey(event: string, params: Record<string, unknown>): string {
  return [event, params.experience_id ?? "", params.placement ?? ""].join("|");
}

/* ─────────────────── Public API ─────────────────── */

/**
 * Fire a canonical YES event. Safe to call from anywhere, any lifecycle.
 * Never throws, never blocks, respects consent + dedupe.
 */
export function trackEvent(event: YesAnalyticsEvent, params: YesEventParams = {}): void {
  if (typeof window === "undefined") return;
  if (typeof process !== "undefined" && process.env?.VITEST) return;
  if (isTrackingDisabled()) return;

  // Auto-enrichment
  const enriched: Record<string, unknown> = {
    page_path: params.page_path ?? window.location?.pathname,
    language: params.language ?? currentLocale ?? undefined,
    ...utmParams(),
    ...params,
  };

  const clean = stripPii(enriched);

  // Dedupe
  const key = dedupeKey(event, clean);
  const now = Date.now();
  const prev = lastFire.get(key);
  if (prev && now - prev < DEDUPE_MS) return;
  lastFire.set(key, now);

  // Consent gate
  if (consentState === "denied") {
    pendingQueue.push({ name: event, params: clean });
    return;
  }

  track(event, clean as AnalyticsParams);
}

/* ─────────────────── Test-only helpers ─────────────────── */

export const __testing = {
  reset(): void {
    consentState = "unknown";
    pendingQueue.length = 0;
    lastFire.clear();
    currentLocale = null;
  },
  queueLength(): number {
    return pendingQueue.length;
  },
  getConsent(): ConsentState {
    return consentState;
  },
};
