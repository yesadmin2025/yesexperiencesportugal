/**
 * useHeroVariant — resolves the current visitor's hero copy variant
 * and emits an `exposure` event the first time they see it.
 *
 * Returns `{ scenes, variant, experiment, trackEvent }` so the page
 * can render the variant's per-scene copy AND attribute downstream
 * conversions back to the same variant.
 *
 * SSR contract: on the server we deterministically render the control
 * variant (variants[0]), so the markup is stable for hydration. The
 * client effect then resolves the visitor's actual variant and (only
 * if different) re-renders. Visitors in the control group see ZERO
 * re-renders.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import {
  HERO_COPY_EXPERIMENT,
  applyVariantToScenes,
  type HeroCopyVariant,
} from "@/content/hero-scene-variants";
import type { HeroScene } from "@/content/hero-scenes-manifest";
import { recordAssignment, resolveVariant, trackAbEvent, type AbEvent } from "@/lib/ab-testing";

export type UseHeroVariantResult = {
  variant: HeroCopyVariant;
  scenes: readonly HeroScene[];
  trackEvent: (
    event: AbEvent,
    meta?: { sceneId?: string; extra?: Record<string, unknown> },
  ) => void;
};

export function useHeroVariant(): UseHeroVariantResult {
  // SSR / first paint always renders the control variant — same DOM
  // server and client, no hydration mismatch.
  const [variant, setVariant] = useState<HeroCopyVariant>(() => HERO_COPY_EXPERIMENT.variants[0]);
  const exposedRef = useRef(false);

  useEffect(() => {
    const resolved = resolveVariant(HERO_COPY_EXPERIMENT);
    if (resolved.id !== variant.id) {
      setVariant(resolved);
    }
    if (!exposedRef.current) {
      exposedRef.current = true;
      // Fire-and-forget: assignment + first exposure.
      void recordAssignment(HERO_COPY_EXPERIMENT, resolved);
      void trackAbEvent(HERO_COPY_EXPERIMENT, resolved, "exposure");
    }
    // Intentionally only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scenes = useMemo(() => applyVariantToScenes(variant), [variant]);

  const trackEvent = (
    event: AbEvent,
    meta?: { sceneId?: string; extra?: Record<string, unknown> },
  ) => {
    void trackAbEvent(HERO_COPY_EXPERIMENT, variant, event, meta);
  };

  return { variant, scenes, trackEvent };
}
