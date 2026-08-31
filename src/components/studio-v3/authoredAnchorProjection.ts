/**
 * authoredAnchorProjection — P0-A COMPOSITION TRUTH.
 *
 * The RAW catalogue stop list of a Signature is NOT a sellable itinerary.
 * For anchors that declare an alternative pool ("choose 2 of 5 wineries"),
 * the catalogue lists every CANDIDATE. Emitting that list wholesale invents
 * a day nobody sells: five winery visits in one afternoon, a duration and a
 * price that do not exist, and a commercially unresolvable composition.
 *
 * This module projects the authored anchor down to its canonical
 * cardinality, using ONLY existing per-anchor truth:
 *   - `signatureToursSourceOfTruth` — itinerary entries typed
 *     `alternative-pool`, and `poolPick.<pool>.min`
 *   - `tailorBlueprints` — `choice.options` and `choice.pickMin`
 *
 * It never invents a stop, never reorders, never renames, and never touches
 * a core moment: only SURPLUS pool candidates beyond the canonical minimum
 * are dropped, keeping the first ones in authored route order. When the
 * anchor declares no pool, or carries no more candidates than the minimum,
 * the points pass through untouched.
 *
 * Deliberately depends on DATA modules only (no curation / presentation
 * imports) so it can be used from inside the curation authority itself.
 */

import { getSot } from "@/data/signatureToursSourceOfTruth";
import { getTailorBlueprint } from "@/data/tailorBlueprints";

const GENERIC_TOKENS = new Set([
  "adega",
  "adegas",
  "quinta",
  "herdade",
  "casa",
  "vinhos",
  "vinho",
  "winery",
  "wineries",
  "farm",
  "house",
  "museum",
  "cooperativa",
  "coop",
  "portugal",
  "family",
  "estate",
  "cellar",
  "caves",
  "tasting",
  "visit",
]);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const distinctiveTokens = (s: string): string[] =>
  norm(s)
    .split(" ")
    .filter((t) => t.length >= 5 && !GENERIC_TOKENS.has(t));

/**
 * Do two labels name the SAME place? Conservative: exact normalized match,
 * one containing the other, or a shared distinctive (non-generic) token.
 * Catalogue wording differs from source-of-truth wording for the same
 * supplier ("Adega Coop. de Palmela, C.R.L." / "Adega Cooperativa de
 * Palmela"), which is exactly what this resolves — and nothing more.
 */
function sameplace(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(distinctiveTokens(a));
  return distinctiveTokens(b).some((t) => ta.has(t));
}

interface AnchorPoolTruth {
  /** Canonical labels of the anchor's alternative-pool candidates. */
  readonly candidateLabels: string[];
  /** Canonical labels of moments the anchor always includes. */
  readonly coreLabels: string[];
  /** How many candidates the base product actually includes. */
  readonly pickMin: number | null;
}

function anchorPoolTruth(anchorTourId: string | null | undefined): AnchorPoolTruth {
  const empty: AnchorPoolTruth = { candidateLabels: [], coreLabels: [], pickMin: null };
  if (!anchorTourId) return empty;

  const sot = getSot(anchorTourId);
  const blueprint = getTailorBlueprint(anchorTourId);

  const candidateLabels = [
    ...(sot?.itinerary ?? [])
      .filter((entry) => entry.stopType === "alternative-pool")
      .map((entry) => entry.label),
    ...(blueprint?.choice?.options ?? []).map((option) => option.label),
  ];
  const coreLabels = [
    ...(sot?.itinerary ?? [])
      .filter((entry) => entry.stopType !== "alternative-pool")
      .map((entry) => entry.label),
    ...(blueprint?.core ?? []).map((stop) => stop.label),
  ];

  const poolMins = Object.values(sot?.poolPick ?? {})
    .map((pool) => pool.min)
    .filter((min) => typeof min === "number" && min > 0);
  const pickMin =
    poolMins.length > 0
      ? Math.min(...poolMins)
      : typeof blueprint?.choice?.pickMin === "number" && blueprint.choice.pickMin > 0
        ? blueprint.choice.pickMin
        : null;

  return { candidateLabels, coreLabels, pickMin };
}

/** Canonical number of pool picks the base product actually includes. */
export function anchorWineryPickMin(anchorTourId: string | null | undefined): number | null {
  return anchorPoolTruth(anchorTourId).pickMin;
}

export interface AuthoredAnchorProjection<T> {
  /** The canonical authored day — surplus pool candidates removed. */
  readonly points: T[];
  /** Canonical labels dropped as surplus candidates. Diagnostics only. */
  readonly droppedLabels: string[];
  /** True when the raw list was over-cardinal and had to be projected. */
  readonly projected: boolean;
}

/**
 * Collapse an authored anchor stop list to its canonical pool cardinality.
 * Generic over any object carrying a `label`; identity fields untouched.
 */
export function projectAuthoredAnchorStops<T extends { label: string }>(
  anchorTourId: string | null | undefined,
  points: ReadonlyArray<T>,
): AuthoredAnchorProjection<T> {
  const truth = anchorPoolTruth(anchorTourId);
  const pickMin = truth.pickMin;
  if (!pickMin || points.length === 0 || truth.candidateLabels.length === 0) {
    return { points: [...points], droppedLabels: [], projected: false };
  }

  const isCandidate = (label: string) =>
    // A core moment is never a pool candidate, even if the wording is close.
    !truth.coreLabels.some((core) => sameplace(core, label)) &&
    truth.candidateLabels.some((candidate) => sameplace(candidate, label));

  const candidateIndexes = points.map((p, i) => (isCandidate(p.label) ? i : -1)).filter((i) => i >= 0);

  // Nothing surplus to drop — the authored day is already canonical, or the
  // catalogue carries fewer candidates than the product includes (in which
  // case dropping anything would UNDER-deliver).
  if (candidateIndexes.length <= pickMin) {
    return { points: [...points], droppedLabels: [], projected: false };
  }

  const dropped = new Set(candidateIndexes.slice(pickMin));
  return {
    points: points.filter((_, i) => !dropped.has(i)),
    droppedLabels: points.filter((_, i) => dropped.has(i)).map((p) => p.label),
    projected: true,
  };
}
