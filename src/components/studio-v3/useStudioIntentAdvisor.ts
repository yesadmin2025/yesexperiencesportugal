import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adviseStudioIntent } from "@/lib/studio-v3/studioIntentAdvisor.functions";
import {
  buildStudioIntentAdvisorInput,
  studioIntentAdvisorKey,
  type StudioIntentAdvisorResult,
  type StudioIntentInterpretation,
} from "./studioIntentAdvisor";
import type { AdaptiveQuestionKind } from "./adaptiveQuestions";
import type { RefineIntentId } from "./refineIntents";
import type { StudioV3State } from "./types";

const SESSION_KEY = "yes.studio-v3.intent-advisor.session.v1";
const resultCache = new Map<string, StudioIntentAdvisorResult>();
const inflight = new Map<string, Promise<StudioIntentAdvisorResult>>();

function sessionId(): string {
  if (typeof window === "undefined") return "studio-server-session";
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing && existing.length >= 8 && existing.length <= 64) return existing;
    const next =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `studio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return `studio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export async function requestStudioIntentAdviceCached(
  key: string,
  request: () => Promise<StudioIntentAdvisorResult>,
): Promise<StudioIntentAdvisorResult> {
  const cached = resultCache.get(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = request()
    .then((result) => {
      resultCache.set(key, result);
      return result;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

/** Test-only reset for cache/dedupe contracts. */
export function resetStudioIntentAdvisorCache(): void {
  resultCache.clear();
  inflight.clear();
}

/**
 * Non-blocking advisory hook. The deterministic Studio renders immediately;
 * when a validated classification arrives, only choice priority may change.
 */
export function useStudioIntentAdvisor(
  state: StudioV3State,
  availableAdaptiveKinds: ReadonlyArray<AdaptiveQuestionKind>,
  allowedRefineIntentIds: ReadonlyArray<RefineIntentId> = ["more-ocean", "less-wine", "slower"],
): {
  interpretation: StudioIntentInterpretation | null;
  source: StudioIntentAdvisorResult["source"] | "idle";
} {
  const advise = useServerFn(adviseStudioIntent);
  const input = useMemo(
    () => buildStudioIntentAdvisorInput(state, availableAdaptiveKinds, allowedRefineIntentIds),
    [
      state.feeling,
      state.companions,
      state.interests,
      state.rhythm,
      state.destinationIntent,
      state.refinement,
      availableAdaptiveKinds,
      allowedRefineIntentIds,
    ],
  );
  const key = useMemo(() => (input ? studioIntentAdvisorKey(input) : null), [input]);
  const [result, setResult] = useState<StudioIntentAdvisorResult | null>(() =>
    key ? resultCache.get(key) ?? null : null,
  );

  useEffect(() => {
    if (!input || !key) {
      setResult(null);
      return;
    }
    const cached = resultCache.get(key);
    if (cached) {
      setResult(cached);
      return;
    }

    let cancelled = false;
    void requestStudioIntentAdviceCached(key, () =>
      advise({ data: { sessionId: sessionId(), input } }),
    ).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [advise, input, key]);

  return {
    interpretation: result?.interpretation ?? null,
    source: result?.source ?? "idle",
  };
}
