/**
 * Studio V3 — contextual refine intents.
 *
 * A tiny, truth-backed layer on top of the refine surface. It NEVER invents
 * a stop, a coordinate or a price: every transformation either
 *
 *   (a) swaps a current stop for a candidate that the existing replacement
 *       engine (`selectReplacementCandidates` + the resolved Signature's own
 *       stops) already validated for this journey, or
 *   (b) removes a stop the existing rules already allow to be removed.
 *
 * An intent is only offered when it is *executable* for the current day.
 * If the engine cannot satisfy it with real data, the intent is omitted —
 * never rendered as a disabled or decorative chip.
 *
 * Current stop classification comes from the real `REGION_STOPS` catalog via
 * `lookupStopGeo(label).kind`. When a stop cannot be classified we treat it as
 * unknown and never make claims about it.
 */

import { lookupStopGeo } from "@/lib/studio/stop-lookup";

export type RefineIntentId = "more-ocean" | "less-wine" | "slower";

export interface RefineIntentStop {
  readonly label: string;
  readonly story: string;
}

/** A replacement candidate already validated by the refine engine. */
export interface RefineIntentCandidate {
  readonly label: string;
  readonly story: string;
  /** `OptionalStop.type` from the region pool — real data, never inferred. */
  readonly type: string;
  readonly suitsInterests?: ReadonlyArray<string>;
}

export interface RefineIntentResult {
  readonly stops: RefineIntentStop[];
  /** Discreet, factual feedback using the real names involved. */
  readonly summary: string;
  readonly addedLabel: string | null;
  readonly removedLabel: string | null;
}

export interface ResolvedRefineIntent {
  readonly id: RefineIntentId;
  readonly label: string;
  /** Short premium line shown under the label. */
  readonly detail: string;
  readonly apply: () => RefineIntentResult;
}

/** Minimum stops a day may hold after a removal. */
export const REFINE_MIN_STOPS = 2;

const OCEAN_KINDS = new Set(["beach"]);
const WINE_KINDS = new Set(["winery", "cellar"]);
/** Stops that anchor the day's meal — never removed by "Slower". */
const ANCHOR_KINDS = new Set(["table"]);

function kindOf(label: string): string | null {
  return lookupStopGeo(label)?.kind ?? null;
}

function isOceanCandidate(c: RefineIntentCandidate): boolean {
  if (c.type === "beach") return true;
  return (c.suitsInterests ?? []).includes("coast");
}

function isWineCandidate(c: RefineIntentCandidate): boolean {
  return c.type === "winery";
}

function replaceAt(
  stops: ReadonlyArray<RefineIntentStop>,
  index: number,
  next: RefineIntentCandidate,
): RefineIntentResult {
  const removedLabel = stops[index].label;
  return {
    stops: stops.map((s, i) => (i === index ? { label: next.label, story: next.story } : s)),
    summary: `${next.label} replaces ${removedLabel}.`,
    addedLabel: next.label,
    removedLabel,
  };
}

function removeAt(stops: ReadonlyArray<RefineIntentStop>, index: number): RefineIntentResult {
  const removedLabel = stops[index].label;
  return {
    stops: stops.filter((_, i) => i !== index),
    summary: `${removedLabel} steps out — the day breathes wider.`,
    addedLabel: null,
    removedLabel,
  };
}

/**
 * Resolve the intents that can actually be executed on THIS day.
 * Pure and deterministic: same input → same intents, same transformations.
 */
export function resolveRefineIntents(input: {
  readonly stops: ReadonlyArray<RefineIntentStop>;
  readonly candidates: ReadonlyArray<RefineIntentCandidate>;
  readonly minStops?: number;
}): ResolvedRefineIntent[] {
  const stops = input.stops;
  const candidates = input.candidates;
  const minStops = input.minStops ?? REFINE_MIN_STOPS;
  const out: ResolvedRefineIntent[] = [];
  if (stops.length === 0) return out;

  const kinds = stops.map((s) => kindOf(s.label));

  // ── More ocean ────────────────────────────────────────────────────────
  // Executable when a validated ocean candidate exists AND at least one
  // current stop is classified as clearly non-ocean (so we know what we are
  // trading). Swaps the LAST such stop — deterministic, keeps the opening.
  const oceanCandidate = candidates.find(isOceanCandidate);
  if (oceanCandidate) {
    let swapIdx = -1;
    for (let i = stops.length - 1; i >= 1; i -= 1) {
      const k = kinds[i];
      if (k && !OCEAN_KINDS.has(k) && !ANCHOR_KINDS.has(k)) {
        swapIdx = i;
        break;
      }
    }
    if (swapIdx > 0) {
      out.push({
        id: "more-ocean",
        label: "More ocean",
        detail: `Trade one inland moment for ${oceanCandidate.label}.`,
        apply: () => replaceAt(stops, swapIdx, oceanCandidate),
      });
    }
  }

  // ── Less wine ─────────────────────────────────────────────────────────
  // Executable only when the day actually holds a wine stop, and either a
  // validated non-wine candidate can take its place, or removing it keeps
  // the day valid.
  const wineIdx = kinds.findIndex((k) => k && WINE_KINDS.has(k));
  if (wineIdx >= 0) {
    const nonWine = candidates.find((c) => !isWineCandidate(c));
    if (nonWine) {
      out.push({
        id: "less-wine",
        label: "Less wine",
        detail: `${nonWine.label} takes the cellar's place.`,
        apply: () => replaceAt(stops, wineIdx, nonWine),
      });
    } else if (stops.length > minStops) {
      out.push({
        id: "less-wine",
        label: "Less wine",
        detail: `Leave ${stops[wineIdx].label} out of the day.`,
        apply: () => removeAt(stops, wineIdx),
      });
    }
  }

  // ── Slower ────────────────────────────────────────────────────────────
  // Executable only when the day can lose one non-anchor stop and stay
  // valid. Removes the last removable stop, never the opening moment.
  if (stops.length > minStops) {
    let slowIdx = -1;
    for (let i = stops.length - 1; i >= 1; i -= 1) {
      const k = kinds[i];
      if (!k || !ANCHOR_KINDS.has(k)) {
        slowIdx = i;
        break;
      }
    }
    if (slowIdx > 0) {
      out.push({
        id: "slower",
        label: "Slower",
        detail: "One moment fewer, more time in each.",
        apply: () => removeAt(stops, slowIdx),
      });
    }
  }

  return out;
}
