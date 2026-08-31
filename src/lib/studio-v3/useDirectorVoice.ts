/**
 * useDirectorVoice — non-blocking AI wording for the Director's question.
 *
 * The deterministic presentation renders IMMEDIATELY. When (and only when)
 * the model returns a candidate that survives the pure fail-closed validator,
 * the wording is swapped in place. The decision, the options and their order
 * are never touched, and a slow or failing model is invisible.
 */

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { composeDirectorVoice } from "@/lib/studio-v3/director-voice.functions";
import {
  presentationFingerprint,
  type PresentationCandidate,
} from "@/lib/studio-v3/questionPresentationAdapter";
import type { DirectorQuestionPresentation } from "@/components/studio-v3/directorQuestionPresentation";

export interface DirectorVoiceSignals {
  feeling?: string | null;
  companions?: string | null;
  rhythm?: string | null;
  interests?: readonly string[];
}

export function useDirectorVoice(args: {
  sessionId: string | null;
  /** Deterministic presentation — the ONLY source of keys and order. */
  base: DirectorQuestionPresentation | null;
  signals: DirectorVoiceSignals;
  enabled?: boolean;
}): PresentationCandidate | null {
  const fetchVoice = useServerFn(composeDirectorVoice);
  const [candidate, setCandidate] = useState<PresentationCandidate | null>(null);
  const cache = useRef(new Map<string, PresentationCandidate | null>());

  const base = args.base;
  const fingerprint = base
    ? presentationFingerprint({
        questionKey: base.questionKey,
        orderedOptionIds: base.offeredOptionIds,
        semanticFingerprint: JSON.stringify([
          args.signals.feeling ?? null,
          args.signals.companions ?? null,
          args.signals.rhythm ?? null,
          [...(args.signals.interests ?? [])].sort(),
        ]),
      })
    : null;

  useEffect(() => {
    if (!base || !fingerprint || !args.sessionId || args.enabled === false) {
      setCandidate(null);
      return;
    }
    if (cache.current.has(fingerprint)) {
      setCandidate(cache.current.get(fingerprint) ?? null);
      return;
    }
    let cancelled = false;
    setCandidate(null);
    void (async () => {
      try {
        const result = await fetchVoice({
          data: {
            sessionId: args.sessionId as string,
            questionKey: base.questionKey,
            baseEyebrow: base.eyebrow,
            baseTitle: base.title,
            baseTitleAccent: base.titleAccent,
            options: base.options.map((o) => ({
              id: o.id,
              label: o.label,
              whisper: o.whisper ?? "",
            })),
            feeling: args.signals.feeling ?? null,
            companions: args.signals.companions ?? null,
            rhythm: args.signals.rhythm ?? null,
            interests: [...(args.signals.interests ?? [])],
          },
        });
        const next = (result?.candidate as PresentationCandidate | null) ?? null;
        cache.current.set(fingerprint, next);
        if (!cancelled) setCandidate(next);
      } catch {
        // Silent: deterministic copy is already on screen.
        cache.current.set(fingerprint, null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, args.sessionId, args.enabled]);

  return candidate;
}
