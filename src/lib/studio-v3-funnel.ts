// Studio V3 — per-step funnel analytics.
//
// Fire-and-forget INSERT into `studio_v3_funnel_events` via the anon
// publishable key. Never blocks the UI, never throws. Captures abandon
// via pagehide/visibilitychange using sendBeacon when available.
//
// Events:
//   enter        — step mounted
//   select       — user picked an option (value: { selection })
//   continue     — moved to next step (value: { ms_on_step })
//   back         — moved to previous step (value: { ms_on_step })
//   abandon      — left the page mid-step (value: { ms_on_step })
//   reshape      — tapped "Reshape day"
//   tab_switch   — configurator tab change (value: { tab })
//   addon_toggle — add-on selected/removed (value: { addon_id, on })
//   secure_open  — opened secure modal
//   secure_confirm — confirmed reservation

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "studio-v3.funnel.session.v1";
const VARIANT_KEY = "studio-v3.funnel.variant.v1";

export type StudioFunnelEvent =
  | "enter"
  | "select"
  | "continue"
  | "back"
  | "abandon"
  | "reshape"
  | "tab_switch"
  | "addon_toggle"
  | "secure_open"
  | "secure_confirm";

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
    return window.sessionStorage.getItem(VARIANT_KEY);
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

/**
 * Resolve the Supabase REST URL + anon key for sendBeacon. We use the
 * publishable env vars exposed to the client; falls back to the imported
 * client config when env vars are missing in unusual builds.
 */
function beaconTarget(): { url: string; key: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) return null;
  return {
    url: `${url}/rest/v1/studio_v3_funnel_events`,
    key,
  };
}

/** Fire one event. Never awaits, never throws. */
export function trackStep(input: TrackInput): void {
  if (!isBrowser() || isTest()) return;
  const session_id = getFunnelSessionId();
  const variant = getFunnelVariant();
  const row = {
    session_id,
    step_number: input.stepNumber,
    step_key: input.stepKey,
    event: input.event,
    value: (input.value ?? null) as never,
    variant,
    user_agent: window.navigator?.userAgent?.slice(0, 256) ?? null,
  };
  // Use the Supabase client — it handles auth header rotation. The .then()
  // swallows promise rejections so a failed insert never bubbles.
  try {
    void supabase
      .from("studio_v3_funnel_events")
      .insert(row)
      .then(() => undefined);
  } catch {
    /* silent */
  }
}

/** sendBeacon path — only used for abandon on pagehide/visibilitychange. */
function trackBeacon(input: TrackInput): void {
  if (!isBrowser() || isTest()) return;
  const target = beaconTarget();
  if (!target || !navigator?.sendBeacon) {
    trackStep(input);
    return;
  }
  const row = {
    session_id: getFunnelSessionId(),
    step_number: input.stepNumber,
    step_key: input.stepKey,
    event: input.event,
    value: input.value ?? null,
    variant: getFunnelVariant(),
    user_agent: window.navigator?.userAgent?.slice(0, 256) ?? null,
  };
  try {
    const blob = new Blob([JSON.stringify(row)], {
      type: "application/json",
    });
    // Beacon does not let us add custom headers; PostgREST requires apikey
    // + Authorization. Fall back to a keepalive fetch which does.
    void fetch(`${target.url}`, {
      method: "POST",
      keepalive: true,
      headers: {
        "content-type": "application/json",
        apikey: target.key,
        authorization: `Bearer ${target.key}`,
        prefer: "return=minimal",
      },
      body: blob,
    }).catch(() => undefined);
  } catch {
    /* silent */
  }
}

/**
 * useStepTimer — call once at the top of each step component.
 * Emits `enter` on mount and `continue`/`back`/`abandon` on unmount with
 * `ms_on_step`. The exit reason is read from a ref the parent updates
 * before unmounting (default "abandon").
 */
export function useStepTimer(stepNumber: number, stepKey: string): {
  markExit: (reason: "continue" | "back") => void;
} {
  const enteredAt = useRef<number>(0);
  const exitReason = useRef<"continue" | "back" | "abandon">("abandon");

  useEffect(() => {
    enteredAt.current = Date.now();
    trackStep({ stepNumber, stepKey, event: "enter" });

    const onHide = () => {
      // Only fire once per hide cycle.
      if (document.visibilityState === "hidden") {
        const ms = Date.now() - enteredAt.current;
        trackBeacon({
          stepNumber,
          stepKey,
          event: "abandon",
          value: { ms_on_step: ms },
        });
      }
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
