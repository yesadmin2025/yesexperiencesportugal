// MobileBeatReveal — DISABLED.
//
// The full-screen beat overlay was hiding the map + the active question
// for ~1.8s on every phase change on mobile, which read as "nothing is
// happening / everything is confusing". We now rely on:
//   - StudioV3ProgressStepper (persistent beat dots at top)
//   - ComposerMap (visible behind/around the question, lighting up
//     progressively as choices land)
//   - The short Reaction beat between phases
// to communicate progression. This component is kept as a no-op so any
// existing call sites and tests still resolve.

import { useEffect } from "react";
import type { StudioV3BeatId } from "./StudioV3ProgressStepper";

export interface MobileBeatRevealProps {
  beat: StudioV3BeatId | null;
  index: number;
  onDone: () => void;
}

export function MobileBeatReveal({ beat, onDone }: MobileBeatRevealProps) {
  useEffect(() => {
    if (beat) onDone();
  }, [beat, onDone]);
  return null;
}
