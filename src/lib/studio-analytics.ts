/**
 * Studio analytics — one helper, one vocabulary.
 *
 * The Studio has two lower-level channels:
 *   • `studio-v3-funnel.ts` → internal Supabase funnel table (+ GA4 mirror)
 *   • `studio-v3-telemetry.ts` → local audit buffer / debug console
 *
 * This module is the ONLY place Studio product events are named. P11 makes
 * semantic product events observable in the internal funnel too: events that
 * already have a native funnel event keep that route; every other semantic
 * event is stored as `milestone` with `value.studio_event`, then keeps its
 * existing GA4 behaviour. No call site needs to double-instrument.
 */

import { trackEvent, type YesAnalyticsEvent } from "@/lib/analytics-events";
import { trackStep, type StudioFunnelEvent } from "@/lib/studio-v3-funnel";

export type StudioAnalyticsEvent =
  | "studio_enter"
  | "phase_view"
  | "choice_selected"
  | "surprise_me_selected"
  | "logistics_completed"
  | "interpretation_viewed"
  | "refine_intent_selected"
  | "composition_generated"
  | "map_viewed"
  | "moment_kept"
  | "moment_swapped"
  | "moment_removed"
  | "story_reveal_viewed"
  | "price_expanded"
  | "guest_details_started"
  | "guest_details_completed"
  | "living_day_seen"
  | "living_day_changed"
  | "back_navigation"
  | "abandon_by_phase"
  // TURBO 1 — Living Canvas + Shape. Structural only, never raw free text.
  | "studio_thread_added"
  | "studio_thread_removed"
  | "studio_question_generated"
  | "studio_fork_answered"
  | "studio_composition_changed"
  | "studio_tradeoff_shown"
  | "studio_tradeoff_resolved"
  | "studio_swap"
  | "studio_undo"
  // FINAL CLOSURE — product outcome seams. Structural identifiers only.
  | "studio_signature_candidate"
  | "studio_final_skeleton"
  | "studio_checkout_started"
  // PASS 4 — the committed day cannot honour the exact date chosen. Structural
  // only: never the stop, never the date.
  | "logistics_date_conflict";


/**
 * Events the funnel already owns end-to-end (table row + GA4 mirror).
 * Routing them through `trackStep` avoids a duplicate GA4 hit.
 *
 * Important: `price_expanded` is NOT a tier choice. P11 deliberately keeps
 * it as a semantic milestone so opening the price details can never pollute
 * investment/tier analysis.
 */
const VIA_FUNNEL: Partial<Record<StudioAnalyticsEvent, StudioFunnelEvent>> = {
  phase_view: "enter",
  choice_selected: "select",
  back_navigation: "back",
  abandon_by_phase: "abandon",
  story_reveal_viewed: "reveal_seen",
  guest_details_started: "secure_open",
};

/** Direct GA4 names for Studio events that have a dedicated catalogue name. */
const DIRECT_GA: Partial<Record<StudioAnalyticsEvent, YesAnalyticsEvent>> = {
  studio_enter: "studio_started",
  price_expanded: "studio_price_expanded",
  guest_details_completed: "studio_checkout_started",
  studio_checkout_started: "studio_checkout_started",
};

export interface StudioAnalyticsParams {
  phase?: string;
  stepNumber?: number;
  [key: string]: unknown;
}

const STUDIO_PII_KEYS = new Set([
  "email",
  "e_mail",
  "phone",
  "tel",
  "telephone",
  "name",
  "full_name",
  "given_name",
  "family_name",
  "message",
  "notes",
  "address",
  "pickup_address",
  "customer_email",
  "user_id",
]);

/** P11 defence-in-depth: internal funnel milestones must never store PII. */
export function stripStudioAnalyticsPii(params: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (STUDIO_PII_KEYS.has(key.toLowerCase())) continue;
    clean[key] = value;
  }
  return clean;
}

/** Fire one Studio product event. Never throws, never blocks the journey. */
export function trackStudio(event: StudioAnalyticsEvent, params: StudioAnalyticsParams = {}): void {
  const { phase = "unknown", stepNumber = 0, ...rest } = params;
  const safeRest = stripStudioAnalyticsPii(rest);
  try {
    const funnel = VIA_FUNNEL[event];
    if (funnel) {
      trackStep({
        stepNumber,
        stepKey: phase,
        event: funnel,
        value: { studio_event: event, ...safeRest },
      });
      return;
    }

    // P11: semantic events that previously existed only in GA4 now also land
    // in the session-scoped Supabase funnel. `milestone` has no GA mirror, so
    // the GA call below remains the single GA hit.
    trackStep({
      stepNumber,
      stepKey: phase,
      event: "milestone",
      value: { studio_event: event, ...safeRest },
    });

    const ga = DIRECT_GA[event];
    trackEvent((ga ?? "studio_step_completed") as YesAnalyticsEvent, {
      experience_type: "studio",
      studio_event: event,
      phase,
      ...safeRest,
    });
  } catch {
    /* analytics must never break the Studio */
  }
}
