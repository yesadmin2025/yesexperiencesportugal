import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getDriftSessionId } from "./session";

/**
 * Drift telemetry — fire-and-forget client helper. Never blocks the
 * narrative. No PII; only the session id + the event + an optional
 * structured meta payload survive the trip.
 *
 * The validated `event` set must match the CHECK in the
 * drift_session_events RLS policy.
 */

export type DriftEvent =
  | "session_start"
  | "scene_shown"
  | "scene_answered"
  | "signal_captured"
  | "drift_complete"
  | "reveal_shown"
  | "cta_book"
  | "cta_save"
  | "cta_refine"
  | "cta_whatsapp"
  | "session_drop"
  // Studio v4 — drawer & conversion telemetry
  | "v4_drawer_open"
  | "v4_drawer_tab"
  | "v4_reco_add"
  | "v4_fast_mode_on";

interface RecordOpts {
  chapterId?: string;
  signalKey?: string;
  signalValue?: string;
  meta?: Record<string, unknown>;
}

export async function recordDriftEvent(event: DriftEvent, opts: RecordOpts = {}): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = getDriftSessionId();
  try {
    await supabase.from("drift_session_events").insert([
      {
        session_id: sessionId,
        event,
        chapter_id: opts.chapterId ?? null,
        signal_key: opts.signalKey ?? null,
        signal_value: opts.signalValue ?? null,
        meta: opts.meta ? (JSON.parse(JSON.stringify(opts.meta)) as Json) : null,
      },
    ]);
  } catch {
    /* swallow — telemetry must never break the experience */
  }
}

/**
 * Predictive behavior telemetry — fire-and-forget. Captures raw signals
 * (decision latency, linger, skip, attraction) plus the current prediction
 * snapshot so we can later analyze how the engine adapts in real users.
 *
 * Schema mirror: drift_behavior_events (signal_type CHECK + length limits).
 */

export type BehaviorSignalType =
  | "decision"
  | "linger"
  | "skip"
  | "attraction"
  | "prediction_update";

export interface BehaviorEventOpts {
  chapterId?: string;
  decisionLatencyMs?: number;
  lingerMs?: number;
  attractionTarget?: string;
  predictedArchetype?: string;
  predictedTonalRegister?: string;
  predictedIntensity?: string;
  revealConfidence?: number;
  meta?: Record<string, unknown>;
}

export async function recordDriftBehaviorEvent(
  signalType: BehaviorSignalType,
  opts: BehaviorEventOpts = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = getDriftSessionId();
  const cap = (v: string | undefined | null, n: number) =>
    v == null ? null : String(v).slice(0, n);
  try {
    await supabase.from("drift_behavior_events").insert([
      {
        session_id: sessionId,
        signal_type: signalType,
        chapter_id: cap(opts.chapterId, 64),
        decision_latency_ms: opts.decisionLatencyMs ?? null,
        linger_ms: opts.lingerMs ?? null,
        attraction_target: cap(opts.attractionTarget, 96),
        predicted_archetype: cap(opts.predictedArchetype, 32),
        predicted_tonal_register: cap(opts.predictedTonalRegister, 32),
        predicted_intensity: cap(opts.predictedIntensity, 32),
        reveal_confidence: opts.revealConfidence ?? null,
        meta: opts.meta ? (JSON.parse(JSON.stringify(opts.meta)) as Json) : {},
      },
    ]);
  } catch {
    /* swallow */
  }
}
