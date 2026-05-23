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
  | "session_drop";

interface RecordOpts {
  chapterId?: string;
  signalKey?: string;
  signalValue?: string;
  meta?: Record<string, unknown>;
}

export async function recordDriftEvent(
  event: DriftEvent,
  opts: RecordOpts = {},
): Promise<void> {
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
