// Studio v2 — predictive state persistence.
//
// Thin server fns that read/write the per-session prediction state. Sessions
// are anonymous (cookie-based id passed from client). All access via
// supabaseAdmin — no auth required, no user PII.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  applySignal,
  emptyMoodVector,
  type GestureSignal,
  type MoodVector,
  type PredictionState,
} from "./predictions";
import type { PriorityKey } from "./profile";

const sessionIdSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

const priorityKeyValues = [
  "vineyard_lunch",
  "wine_cellar",
  "coastal_scenery",
  "hidden_villages",
  "architecture",
  "heritage",
  "local_gastronomy",
  "photography",
  "quiet_luxury",
  "wellness",
  "boat",
] as const;
const priorityArray = z.array(z.enum(priorityKeyValues)).max(8).optional();

const signalSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("swap"),
    fromKey: z.string().min(1).max(120),
    toKey: z.string().min(1).max(120),
    toPriorities: priorityArray,
  }),
  z.object({
    type: z.literal("remove"),
    stopKey: z.string().min(1).max(120),
    priorities: priorityArray,
  }),
  z.object({
    type: z.literal("dwell"),
    stopKey: z.string().min(1).max(120),
    ms: z.number().min(0).max(120_000),
    priorities: priorityArray,
  }),
  z.object({
    type: z.literal("reorder"),
    stopKey: z.string().min(1).max(120),
  }),
  z.object({
    type: z.literal("longpress"),
    stopKey: z.string().min(1).max(120),
    priorities: priorityArray,
  }),
]);

function defaultState(): PredictionState {
  return {
    weights: {} as Record<PriorityKey, number>,
    moodVector: emptyMoodVector(),
    paceConfidence: 0.5,
    signalCount: 0,
  };
}

async function loadOrInit(sessionId: string): Promise<PredictionState> {
  const { data, error } = await supabaseAdmin
    .from("studio_v2_predictions")
    .select("weights, mood_vector, pace_confidence, signal_count")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return defaultState();
  return {
    weights: (data.weights as Record<PriorityKey, number>) ?? {},
    moodVector: (data.mood_vector as MoodVector) ?? emptyMoodVector(),
    paceConfidence: Number(data.pace_confidence ?? 0.5),
    signalCount: Number(data.signal_count ?? 0),
  };
}

export const loadPredictions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ sessionId: sessionIdSchema }).parse(input))
  .handler(async ({ data }) => {
    const state = await loadOrInit(data.sessionId);
    return { state };
  });

export const recordSignal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: sessionIdSchema,
        signal: signalSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const prev = await loadOrInit(data.sessionId);
    const next = applySignal(prev, data.signal as GestureSignal);

    const { error } = await supabaseAdmin.from("studio_v2_predictions").upsert(
      {
        session_id: data.sessionId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        weights: next.weights as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mood_vector: next.moodVector as any,
        pace_confidence: next.paceConfidence,
        signal_count: next.signalCount,
      },
      { onConflict: "session_id" },
    );

    if (error) throw new Error(error.message);
    return { state: next };
  });
