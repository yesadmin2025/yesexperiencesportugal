/**
 * useStudioVariant — resolves the visitor's Studio drawer-mode variant
 * and fires an `exposure` event the first time they see it.
 *
 * Control = "peek", variant = "open". SSR renders control to keep
 * markup stable; the client swaps in the resolved variant once.
 */

import { useEffect, useRef, useState } from "react";

import {
  STUDIO_DRAWER_EXPERIMENT,
  recordStudioAssignment,
  resolveStudioVariant,
  trackStudioAbEvent,
  type StudioAbEvent,
} from "@/lib/studio-ab";

export type StudioDrawerVariant = "peek" | "open";

export type UseStudioVariantResult = {
  variant: StudioDrawerVariant;
  trackEvent: (
    event: StudioAbEvent,
    meta?: { sceneId?: string; extra?: Record<string, unknown> },
  ) => void;
};

export function useStudioVariant(): UseStudioVariantResult {
  const [variant, setVariant] = useState<StudioDrawerVariant>(
    () => STUDIO_DRAWER_EXPERIMENT.variants[0].id as StudioDrawerVariant,
  );
  const exposedRef = useRef(false);

  useEffect(() => {
    const resolved = resolveStudioVariant(STUDIO_DRAWER_EXPERIMENT);
    if (resolved.id !== variant) {
      setVariant(resolved.id as StudioDrawerVariant);
    }
    if (!exposedRef.current) {
      exposedRef.current = true;
      void recordStudioAssignment(STUDIO_DRAWER_EXPERIMENT, resolved.id);
      void trackStudioAbEvent(STUDIO_DRAWER_EXPERIMENT, resolved.id, "exposure");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackEvent: UseStudioVariantResult["trackEvent"] = (event, meta) => {
    void trackStudioAbEvent(STUDIO_DRAWER_EXPERIMENT, variant, event, meta);
  };

  return { variant, trackEvent };
}
