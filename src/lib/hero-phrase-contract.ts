/**
 * Hero phrase cadence contract.
 *
 * Single source of truth for the film-title cadence:
 *   • enter (fadeIn)         = 1200ms
 *   • hold                   ≥ 3200ms
 *   • exit  (fadeOut)        = 900ms
 *   • breathing pause (gap)  = 400–600ms
 *
 * Used by:
 *   - HeroPhraseDebug overlay (per-phrase live readout)
 *   - HeroContractAssert (preview-only automated check that surfaces
 *     a fixed banner + console.error + window.__heroContractViolations
 *     whenever any phrase scene violates the contract)
 */

export const HERO_PHRASE_CONTRACT = {
  fadeInMs: 1400,
  holdMinMs: 3600,
  fadeOutMs: 1000,
  gapMinMs: 600,
  gapMaxMs: 900,
  toleranceMs: 40,
} as const;

export type PhraseTimings = {
  fadeInMs: number;
  holdMs: number;
  fadeOutMs: number;
};

export type ContractViolation = {
  phraseIndex: number; // -1 = global (gap)
  field: "fadeInMs" | "holdMs" | "fadeOutMs" | "gapMs";
  actual: number;
  expected: string;
};

export type ContractFix = ContractViolation & { fixed: number };

const C = HERO_PHRASE_CONTRACT;

function clampEnter(v: number): number {
  if (Math.abs(v - C.fadeInMs) <= C.toleranceMs) return v;
  return C.fadeInMs;
}
function clampHold(v: number): number {
  if (v >= C.holdMinMs - C.toleranceMs) return v;
  return C.holdMinMs;
}
function clampExit(v: number): number {
  if (Math.abs(v - C.fadeOutMs) <= C.toleranceMs) return v;
  return C.fadeOutMs;
}
function clampGap(v: number): number {
  if (v < C.gapMinMs - C.toleranceMs) return C.gapMinMs;
  if (v > C.gapMaxMs + C.toleranceMs) return C.gapMaxMs;
  return v;
}

export function validateHeroContract(scenes: PhraseTimings[], gapMs: number): ContractViolation[] {
  const out: ContractViolation[] = [];
  scenes.forEach((s, i) => {
    if (Math.abs(s.fadeInMs - C.fadeInMs) > C.toleranceMs) {
      out.push({
        phraseIndex: i,
        field: "fadeInMs",
        actual: s.fadeInMs,
        expected: `${C.fadeInMs}ms ±${C.toleranceMs}`,
      });
    }
    if (s.holdMs < C.holdMinMs - C.toleranceMs) {
      out.push({
        phraseIndex: i,
        field: "holdMs",
        actual: s.holdMs,
        expected: `≥${C.holdMinMs}ms`,
      });
    }
    if (Math.abs(s.fadeOutMs - C.fadeOutMs) > C.toleranceMs) {
      out.push({
        phraseIndex: i,
        field: "fadeOutMs",
        actual: s.fadeOutMs,
        expected: `${C.fadeOutMs}ms ±${C.toleranceMs}`,
      });
    }
  });
  if (gapMs < C.gapMinMs - C.toleranceMs || gapMs > C.gapMaxMs + C.toleranceMs) {
    out.push({
      phraseIndex: -1,
      field: "gapMs",
      actual: gapMs,
      expected: `${C.gapMinMs}–${C.gapMaxMs}ms`,
    });
  }
  return out;
}

/**
 * Auto-fix mode: clamps every offending timing to the nearest in-contract
 * value and returns the corrected scenes + gap, plus a diff of every
 * change made. Pure function — does not mutate inputs.
 */
export function autoFixHeroContract<T extends PhraseTimings>(
  scenes: T[],
  gapMs: number,
): { scenes: T[]; gapMs: number; changes: ContractFix[] } {
  const changes: ContractFix[] = [];
  const fixedScenes = scenes.map((s, i) => {
    const next = { ...s };
    const fIn = clampEnter(s.fadeInMs);
    if (fIn !== s.fadeInMs) {
      changes.push({
        phraseIndex: i,
        field: "fadeInMs",
        actual: s.fadeInMs,
        expected: `${C.fadeInMs}ms ±${C.toleranceMs}`,
        fixed: fIn,
      });
      next.fadeInMs = fIn;
    }
    const hold = clampHold(s.holdMs);
    if (hold !== s.holdMs) {
      changes.push({
        phraseIndex: i,
        field: "holdMs",
        actual: s.holdMs,
        expected: `≥${C.holdMinMs}ms`,
        fixed: hold,
      });
      next.holdMs = hold;
    }
    const fOut = clampExit(s.fadeOutMs);
    if (fOut !== s.fadeOutMs) {
      changes.push({
        phraseIndex: i,
        field: "fadeOutMs",
        actual: s.fadeOutMs,
        expected: `${C.fadeOutMs}ms ±${C.toleranceMs}`,
        fixed: fOut,
      });
      next.fadeOutMs = fOut;
    }
    return next;
  });
  const fixedGap = clampGap(gapMs);
  if (fixedGap !== gapMs) {
    changes.push({
      phraseIndex: -1,
      field: "gapMs",
      actual: gapMs,
      expected: `${C.gapMinMs}–${C.gapMaxMs}ms`,
      fixed: fixedGap,
    });
  }
  return { scenes: fixedScenes, gapMs: fixedGap, changes };
}
