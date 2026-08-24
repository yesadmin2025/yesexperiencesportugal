import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import { adviseStudioIntent } from "@/lib/studio-v3/studioIntentAdvisor.functions";
import {
  buildStudioIntentAdvisorInput,
  type StudioIntentAdvisorResult,
} from "./studioIntentAdvisor";
import type { AdaptiveQuestionKind } from "./adaptiveQuestions";
import type { StudioV3State } from "./types";

const FALLBACK: StudioIntentAdvisorResult = { interpretation: null, source: "fallback" };

/**
 * Client hook for the Studio intent advisor.
 *
 * Calls the server-side advisor only when a stable, non-identifying payload
 * can be built. The result is deterministic fallback until the server responds,
 * so UI wiring never blocks on network.
 */
export function useStudioIntentAdvisor(
  state: StudioV3State,
  availableAdaptiveKinds: ReadonlyArray<AdaptiveQuestionKind>,
): StudioIntentAdvisorResult {
  const sessionId = useBuilderSessionId();
  const advise = useServerFn(adviseStudioIntent);
  const [result, setResult] = useState<StudioIntentAdvisorResult>(FALLBACK);

  const input = buildStudioIntentAdvisorInput(
    state,
    availableAdaptiveKinds,
    ["more-ocean", "less-wine", "slower"],
  );

  useEffect(() => {
    if (!input || !sessionId) return;

    let cancelled = false;
    advise({ data: { sessionId, input } })
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch(() => {
        if (!cancelled) setResult(FALLBACK);
      });

    return () => {
      cancelled = true;
    };
  }, [advise, input, sessionId]);

  return result;
}
