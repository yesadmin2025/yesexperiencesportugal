/**
 * Studio analytics — one helper, one vocabulary.
 *
 * The Studio already has two lower-level channels:
 *   • `studio-v3-funnel.ts`  → internal Supabase funnel table (+ GA4 mirror)
 *   • `studio-v3-telemetry.ts` → local audit buffer / debug console
 *
 * This module is the ONLY place Studio product events are named. It maps the
 * product vocabulary onto the existing GA4 catalogue so nothing is
 * double-counted: events that the funnel already mirrors to GA4 are routed
 * through `trackStep` (single write), everything else goes straight to
 * `trackEvent`.
 */

import { trackEvent, type YesAnalyticsEvent } from "@/lib/analytics-events";
import { trackStep, type StudioFunnelEvent } from "@/lib/studio-v3-funnel";

export type StudioAnalyticsEvent =
  | "studio_enter"
  | "phase_view"
  | "choice_selected"
  | "surprise_me_selected"
  | "logistics_completed"
  | "composition_generated"
  | "map_viewed"
  | "moment_kept"
  | "moment_swapped"
  | "moment_removed"
  | "story_reveal_viewed"
  | "price_expanded"
  | "guest_details_started"
  | "guest_details_completed"
  | "back_navigation"
  | "abandon_by_phase";

/**
 * Events the funnel already owns end-to-end (table row + GA4 mirror).
 * Routing them through `trackStep` avoids a duplicate GA4 hit.
 */
const VIA_FUNNEL: Partial<Record<StudioAnalyticsEvent, StudioFunnelEvent>> = {
  phase_view: "enter",
  choice_selected: "select",
  back_navigation: "back",
  abandon_by_phase: "abandon",
  story_reveal_viewed: "reveal_seen",
  price_expanded: "tier_chosen",
  guest_details_started: "secure_open",
};

/** Direct GA4 names for the Studio-only events. */
const DIRECT_GA: Partial<Record<StudioAnalyticsEvent, YesAnalyticsEvent>> = {
  studio_enter: "studio_started",
  guest_details_completed: "studio_checkout_started",
};

export interface StudioAnalyticsParams {
  phase?: string;
  stepNumber?: number;
  [key: string]: unknown;
}

/** Fire one Studio product event. Never throws, never blocks the journey. */
export function trackStudio(
  event: StudioAnalyticsEvent,
  params: StudioAnalyticsParams = {},
): void {
  const { phase = "unknown", stepNumber = 0, ...rest } = params;
  try {
    const funnel = VIA_FUNNEL[event];
    if (funnel) {
      trackStep({
        stepNumber,
        stepKey: phase,
        event: funnel,
        value: { studio_event: event, ...rest },
      });
      return;
    }
    const ga = DIRECT_GA[event];
    trackEvent((ga ?? "studio_step_completed") as YesAnalyticsEvent, {
      experience_type: "studio",
      studio_event: event,
      phase,
      ...rest,
    });
  } catch {
    /* analytics must never break the Studio */
  }
}
