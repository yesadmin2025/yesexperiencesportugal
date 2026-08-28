/**
 * Studio V3 — Pass 2B moment authorship helpers.
 *
 * Pure, side-effect free. Three narrow jobs, none of which touch curation
 * scoring, rhythm semantics, route authority or pricing:
 *
 *  1. `resolveMomentReason` — ONE short, truthful "why this fits you" line
 *     per moment, derived only from (a) the real stop metadata kind in the
 *     canonical `REGION_STOPS` catalog and (b) signals the traveller
 *     actually selected. When no truthful specific reason exists we return
 *     `null` — never generic filler.
 *  2. `describeStructuralDelta` — the tiny structural chip text after a
 *     successful authorship gesture. Structural only; no explanation.
 *  3. `genericiseWineryText` — replaces canonical winery labels inside any
 *     customer-facing string with their generic display label, so supplier
 *     names cannot leak through feedback, reasons or delta copy.
 */

import { lookupStopGeo } from "@/lib/studio/stop-lookup";
import type { StopKind } from "@/data/regionStops";
import type { Feeling, Interest } from "./types";

export interface MomentReasonSignals {
  readonly interests?: ReadonlyArray<Interest | string> | null;
  readonly feeling?: Feeling | string | null;
}

interface ReasonRule {
  /** Typed against the real catalog taxonomy so drift fails at compile time. */
  readonly kinds: ReadonlyArray<StopKind>;
  readonly interests: ReadonlyArray<Interest>;
  readonly feelings: ReadonlyArray<Feeling>;
  readonly reason: string;
}

/**
 * Every rule requires a REAL catalog kind AND a signal the traveller really
 * selected. No rule fires on inference or on the absence of a signal.
 */
const REASON_RULES: ReadonlyArray<ReasonRule> = [
  {
    kinds: ["winery", "cellar"],
    interests: ["wine"],
    feelings: ["wine-food"],
    reason: "Because you chose wine.",
  },
  {
    kinds: ["table", "market"],
    interests: ["gastronomy"],
    feelings: ["wine-food"],
    reason: "Because you chose food.",
  },
  {
    kinds: ["beach"],
    interests: ["coast"],
    feelings: ["coastal"],
    reason: "Because you chose the coast.",
  },
  {
    kinds: ["heritage"],
    interests: ["heritage"],
    feelings: ["culture"],
    reason: "Because you chose heritage.",
  },
  {
    kinds: ["viewpoint"],
    interests: ["photography", "nature"],
    feelings: [],
    reason: "Because you chose the views.",
  },
  {
    kinds: ["village", "market"],
    interests: ["local-life"],
    feelings: ["hidden"],
    reason: "Because you chose local life.",
  },
  {
    kinds: ["workshop"],
    interests: ["hands-on"],
    feelings: ["hands-on"],
    reason: "Because you chose something hands-on.",
  },
];

/**
 * One truthful reason for a moment, or `null` when nothing specific and
 * factual can be said. Deterministic: same input → same output.
 */
export function resolveMomentReason(
  label: string,
  signals: MomentReasonSignals,
): string | null {
  const kind: StopKind | null = lookupStopGeo(label)?.kind ?? null;
  if (!kind) return null;
  const interests = new Set((signals.interests ?? []).map(String));
  const feeling = signals.feeling ? String(signals.feeling) : null;

  for (const rule of REASON_RULES) {
    if (!rule.kinds.includes(kind)) continue;
    const interestMatch = rule.interests.some((i) => interests.has(i));
    const feelingMatch = !!feeling && rule.feelings.includes(feeling);
    if (interestMatch || feelingMatch) return rule.reason;
  }
  return null;
}

export type StructuralDelta = "swap" | "earlier" | "later" | "remove";

/** Tiny structural chip text. Never an explanation, never a price claim. */
export function describeStructuralDelta(delta: StructuralDelta): string {
  switch (delta) {
    case "swap":
      return "Moment swapped";
    case "earlier":
      return "Moved earlier";
    case "later":
      return "Moved later";
    case "remove":
      return "1 moment removed";
  }
}

/**
 * Replace any canonical winery label inside a customer-facing string with
 * its generic display label. Longest labels first so partial names inside
 * longer names cannot survive.
 */
export function genericiseWineryText(
  text: string,
  displayLabels: ReadonlyMap<string, string> | null | undefined,
): string {
  if (!text || !displayLabels || displayLabels.size === 0) return text;
  let out = text;
  const entries = [...displayLabels.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [canonical, generic] of entries) {
    if (!canonical || canonical === generic) continue;
    out = out.split(canonical).join(generic);
  }
  return out;
}

export interface AuthoredStop {
  readonly label: string;
  readonly story: string;
}

/**
 * Pure route gesture. Returns a NEW array; never mutates the input, never
 * consults pricing, rhythm or curation. Invalid gestures (out of bounds,
 * below the minimum, missing replacement) return the input array unchanged
 * so callers cannot produce an untruthful route.
 */
export function applyGesture(
  stops: ReadonlyArray<AuthoredStop>,
  index: number,
  gesture: StructuralDelta,
  options?: { readonly replacement?: AuthoredStop | null; readonly minStops?: number },
): AuthoredStop[] {
  const current = stops.map((s) => ({ ...s }));
  if (index < 0 || index >= current.length) return current;
  const minStops = options?.minStops ?? 1;

  switch (gesture) {
    case "earlier": {
      if (index === 0) return current;
      [current[index - 1], current[index]] = [current[index], current[index - 1]];
      return current;
    }
    case "later": {
      if (index >= current.length - 1) return current;
      [current[index], current[index + 1]] = [current[index + 1], current[index]];
      return current;
    }
    case "remove": {
      if (current.length <= minStops) return current;
      return current.filter((_, i) => i !== index);
    }
    case "swap": {
      const replacement = options?.replacement;
      if (!replacement) return current;
      current[index] = { label: replacement.label, story: replacement.story };
      return current;
    }
  }
}
