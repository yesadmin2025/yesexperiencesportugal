// Studio V3 — per-step funnel analytics.
//
// Fire-and-forget INSERT into `studio_v3_funnel_events` via the anon
// publishable key. Never blocks the UI, never throws. Captures abandon
// via pagehide/visibilitychange using a keepalive request.
//
// Events:
//   enter          — step mounted
//   select         — user picked an option (value: { selection })
//   continue       — moved to next step (value: { ms_on_step })
//   back           — moved to previous step (value: { ms_on_step })
//   abandon        — left the page mid-step (value: { ms_on_step })
//   milestone      — named Studio product event (value: { studio_event, ... })
//   reshape        — tapped "Reshape day"
//   tab_switch     — configurator tab change (value: { tab })
//   addon_toggle   — add-on selected/removed (value: { addon_id, on })
//   secure_open    — opened secure modal
//   secure_confirm — confirmed reservation/payment

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, type YesAnalyticsEvent } from "@/lib/analytics-events";
import { enrichStudioFunnelTiming } from "@/lib/studio-v3/funnelTiming";
import { assignP14YourDayCtaVariant } from "@/lib/studio-v3/experiments";

const SESSION_KEY = "studio-v3.funnel.session.v1";
const VARIANT_KEY = "studio-v3.funnel.variant.v1";

export type StudioFunnelEvent =
  | "enter"
  | "select"
  | "continue"
  | "back"
  | "abandon"
  | "milestone"
  | "reshape"
  | "tab_switch"
  | "addon_toggle"
  | "secure_open"
  | "secure_confirm"
  | "purchase_intent"
  | "tier_chosen"
  | "reveal_seen";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isTest(): boolean {
  return typeof process !== "undefined" && !!process.env?.VITEST;
}

function newSessionId(): string {
  const a = Math.random().toString(36).slice(2, 10);
  const b = Date.now().toString(36);
  return `${b}-${a}`;
}

export function getFunnelSessionId(): string {
  if (!isBrowser()) return "ssr";
  try {
    const cached = window.sessionStorage.getItem(SESSION_KEY);
    if (cached && cached.length >= 6) return cached;
    const fresh = newSessionId();
    window.sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return newSessionId();
  }
}

export function getFunnelVariant(): string | null {
  if (!isBrowser()) return null;
  try {
    const existing = window.sessionStorage.getItem(VARIANT_KEY);
    if (existing) return existing;

    // P14 is the first live Studio experiment. Assignment happens lazily at
    // the first funnel read, before that event row is built, so every event in
    // the session carries the same arm without mutating render or using PII.
    const assigned = assignP14YourDayCtaVariant(getFunnelSessionId());
    window.sessionStorage.setItem(VARIANT_KEY, assigned);
    return assigned;
  } catch {
    return null;
  }
}

export function setFunnelVariant(variant: string): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(VARIANT_KEY, variant);
  } catch {
    /* private mode — silent */
  }
}

interface TrackInput {
  stepNumber: number;
  stepKey: string;
  event: StudioFunnelEvent;
  value?: Record<string, unknown>;
}

interface FunnelRow {
  session_id: string;
  step_number: number;
  step_key: string;
  event: StudioFunnelEvent;
  value: Record<string, unknown> | null;
  variant: string | null;
  user_agent: string | null;
}

/** Resolve the PostgREST target used by navigation-safe keepalive events. */
function keepaliveTarget(): { url: string; key: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) return null;
  return {
    url: `${url}/rest/v1/studio_v3_funnel_events`,
    key,
  };
}

/**
 * GA4 mirror — the internal table answers "where do sessions die?", but
 * marketing needs the same funnel inside GA4. Mapping lives here (one
 * place) so no call site has to double-instrument.
 */
const GA_MIRROR: Partial<Record<StudioFunnelEvent, YesAnalyticsEvent>> = {
  enter: "studio_phase_view",
  select: "studio_choice_selected",
  back: "studio_back_navigation",
  abandon: "studio_abandon_by_phase",
  reveal_seen: "studio_story_reveal_viewed",
  tier_chosen: "studio_price_expanded",
  secure_open: "studio_guest_details_started",
  secure_confirm: "studio_checkout_completed",
};

function mirrorToGa(input: TrackInput): void {
  const name = GA_MIRROR[input.event];
  if (!name) return;
  try {
    trackEvent(name, {
      step_key: input.stepKey,
      step_number: input.stepNumber,
      ...(input.value ?? {}),
    } as never);
  } catch {
    /* analytics must never break the Studio */
  }
}

function enrichedRow(input: TrackInput): { input: TrackInput; row: FunnelRow } {
  const session_id = getFunnelSessionId();
  const value = enrichStudioFunnelTiming({
    sessionId: session_id,
    stepKey: input.stepKey,
    event: input.event,
    value: input.value,
  });
  const enrichedInput: TrackInput = { ...input, value };
  return {
    input: enrichedInput,
    row: {
      session_id,
      step_number: input.stepNumber,
      step_key: input.stepKey,
      event: input.event,
      value: Object.keys(value).length > 0 ? value : null,
      variant: getFunnelVariant(),
      user_agent: window.navigator?.userAgent?.slice(0, 256) ?? null,
    },
  };
}

function persistViaSupabase(row: FunnelRow): void {
  try {
    void supabase
      .from("studio_v3_funnel_events")
      .insert(row as never)
      .then(() => undefined);
  } catch {
    /* silent */
  }
}

/**
 * Navigation-safe path for abandon and terminal conversion events. When the
 * publishable REST target is unavailable, falls back to the normal client.
 */
function trackKeepalive(input: TrackInput): void {
  if (!isBrowser() || isTest()) return;
  const { input: enrichedInput, row } = enrichedRow(input);
  mirrorToGa(enrichedInput);

  const target = keepaliveTarget();
  if (!target) {
    persistViaSupabase(row);
    return;
  }

  try {
    void fetch(target.url, {
      method: "POST",
      keepalive: true,
      headers: {
        "content-type": "application/json",
        apikey: target.key,
        authorization: `Bearer ${target.key}`,
        prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    }).catch(() => undefined);
  } catch {
    persistViaSupabase(row);
  }
}

/** Fire one event. Never awaits, never throws. */
export function trackStep(input: TrackInput): void {
  if (!isBrowser() || isTest()) return;

  // The browser may navigate immediately after payment success. Persist this
  // terminal event with keepalive rather than relying on a cancellable request.
  if (input.event === "secure_confirm") {
    trackKeepalive(input);
    return;
  }

  const { input: enrichedInput, row } = enrichedRow(input);
  mirrorToGa(enrichedInput);
  persistViaSupabase(row);
}

/**
 * useStepTimer — call once at the top of each step component.
 * Emits `enter` on mount and `continue`/`back`/`abandon` on unmount with
 * `ms_on_step`. The exit reason is read from a ref the parent updates
 * before unmounting (default "abandon").
 */
export function useStepTimer(
  stepNumber: number,
  stepKey: string,
): {
  markExit: (reason: "continue" | "back") => void;
} {
  const enteredAt = useRef<number>(0);
  const exitReason = useRef<"continue" | "back" | "abandon">("abandon");

  useEffect(() => {
    enteredAt.current = Date.now();
    trackStep({ stepNumber, stepKey, event: "enter" });

    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      const ms = Date.now() - enteredAt.current;
      trackKeepalive({
        stepNumber,
        stepKey,
        event: "abandon",
        value: { ms_on_step: ms },
      });
    };
    window.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      window.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      const ms = Date.now() - enteredAt.current;
      const reason = exitReason.current;
      trackStep({
        stepNumber,
        stepKey,
        event: reason,
        value: { ms_on_step: ms },
      });
    };
    // stepNumber/stepKey are stable per mount — re-running would double-fire enter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    markExit: (reason) => {
      exitReason.current = reason;
    },
  };
}
