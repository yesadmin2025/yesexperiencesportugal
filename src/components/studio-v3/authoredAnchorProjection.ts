/**
 * authoredAnchorProjection — P0-A CANONICAL OPERATIONAL FALLBACK.
 *
 * The RAW catalogue stop list of a Signature is NOT a sellable itinerary.
 * It is an inventory: every alternative-pool candidate, every optional
 * route stop, every pass-by. Emitting it wholesale invents a day nobody
 * sells (five wineries in one afternoon) AND breaks the sovereign
 * operational validator (`REGION_RULES.<region>.maxStops`).
 *
 * This module projects the authored anchor down to the canonical
 * OPERATIONAL day, using ONLY existing structural authorities:
 *
 *   - `signatureToursSourceOfTruth` — per-stop `stopType`
 *     (`origin` / `pass-by` / `core` / `optional` / `alternative-pool`)
 *     and `poolPick.<pool>.min`
 *   - `tailorBlueprints` — `core[]` (with `category`, which is where the
 *     included table/lunch moment is structurally provable),
 *     `choice.options[]` and `choice.pickMin`
 *   - `REGION_RULES[region].maxStops` — the hard operational cap the
 *     itinerary validator already enforces
 *   - the authored ordering itself — the only ordering truth that exists
 *
 * Selection is a strict structural priority, never a tourism guess:
 *   1. the included table/lunch moment (never dropped)
 *   2. exactly `poolPick.min` pool candidates, in authored order
 *   3. remaining core moments, in authored order, until the cap is reached
 *   4. unclassified moments, only if slots remain
 *   5. `optional` / `pass-by` / `origin` moments are never part of the
 *      canonical base day
 *
 * Output keeps the ORIGINAL point objects (ids, coordinates, durations,
 * provenance, media) in authored order — this filters, never rewrites.
 *
 * Fail-closed: when an anchor carries no provable structural truth
 * (no source-of-truth entry and no blueprint) the points pass through
 * untouched and `provable` is false. The downstream validator then
 * refuses an over-cap day as it always has — better a visible review
 * than a silently invented itinerary.
 *
 * Depends on DATA modules only (no curation / presentation imports) so it
 * can be used from inside the curation authority itself.
 */

import { getSot } from "@/data/signatureToursSourceOfTruth";
import { getTailorBlueprint } from "@/data/tailorBlueprints";
import { findTour } from "@/data/signatureTours";
import { REGION_RULES } from "@/data/regionRules";
import type { RegionKey } from "@/data/regionStops";

/* ── label matching ─────────────────────────────────────────── */

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
  "national",
  "nacional",
  "santuario",
  "parque",
  "natural",
  "traditional",
  "factory",
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
 * How strongly do two labels name the SAME place?
 *   3 — identical once normalized
 *   2 — one label contains the other
 *   1+ — shared distinctive (non-generic) tokens, one point each
 *   0 — unrelated
 * Catalogue wording differs from source-of-truth wording for the same
 * moment ("Azeitao — long traditional lunch" / "Long lunch in Azeitão"),
 * which is exactly what this resolves — and nothing more. Scores are
 * compared so the BEST structural match wins, never the first.
 */
function matchScore(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 3;
  if (na.includes(nb) || nb.includes(na)) return 2;
  const ta = new Set(distinctiveTokens(a));
  return distinctiveTokens(b).filter((t) => ta.has(t)).length;
}

/* ── structural truth ───────────────────────────────────────── */

type StructuralRole = "table" | "pool" | "core" | "optional" | "unknown";

interface AnchorStructure {
  /** True when at least one structural authority describes this anchor. */
  readonly provable: boolean;
  readonly tableLabels: string[];
  readonly poolLabels: string[];
  readonly coreLabels: string[];
  readonly optionalLabels: string[];
  /** Pool candidates the base product actually includes. */
  readonly pickMin: number | null;
  /** Hard operational cap for the anchor's region. */
  readonly maxStops: number | null;
}

/** Same mapping the Studio uses to pick BuilderMap / REGION_ORIGIN. */
function tourRegionKey(region: string | null | undefined): RegionKey {
  const r = (region ?? "").toLowerCase();
  if (r.includes("alentejo") || r.includes("comporta") || r.includes("evora") || r.includes("évora"))
    return "alentejo";
  if (
    r.includes("centro") ||
    r.includes("coimbra") ||
    r.includes("fátima") ||
    r.includes("fatima") ||
    r.includes("nazaré") ||
    r.includes("nazare") ||
    r.includes("óbidos") ||
    r.includes("obidos")
  )
    return "centro";
  if (r.includes("sintra") || r.includes("cascais") || r.includes("coast") || r.includes("lisbon"))
    return "lisbon-coast";
  return "arrabida";
}

const TABLE_CATEGORIES = new Set(["lunch", "table", "dining", "restaurant", "meal"]);

function anchorStructure(anchorTourId: string | null | undefined): AnchorStructure {
  const empty: AnchorStructure = {
    provable: false,
    tableLabels: [],
    poolLabels: [],
    coreLabels: [],
    optionalLabels: [],
    pickMin: null,
    maxStops: null,
  };
  if (!anchorTourId) return empty;

  const sot = getSot(anchorTourId);
  const blueprint = getTailorBlueprint(anchorTourId);
  if (!sot && !blueprint) return empty;

  const tableLabels: string[] = [];
  const poolLabels: string[] = [];
  const coreLabels: string[] = [];
  const optionalLabels: string[] = [];

  for (const entry of blueprint?.core ?? []) {
    if (TABLE_CATEGORIES.has(String(entry.category))) tableLabels.push(entry.label);
    else coreLabels.push(entry.label);
  }
  for (const option of blueprint?.choice?.options ?? []) poolLabels.push(option.label);

  for (const entry of sot?.itinerary ?? []) {
    switch (entry.stopType) {
      case "alternative-pool":
      case "beach-option":
        poolLabels.push(entry.label);
        break;
      case "core":
        coreLabels.push(entry.label);
        break;
      case "optional":
      case "pass-by":
      case "origin":
        optionalLabels.push(entry.label);
        break;
      default:
        break;
    }
  }

  const poolMins = Object.values(sot?.poolPick ?? {})
    .map((pool) => pool.min)
    .filter((min): min is number => typeof min === "number" && min > 0);
  const pickMin =
    poolMins.length > 0
      ? Math.min(...poolMins)
      : typeof blueprint?.choice?.pickMin === "number" && blueprint.choice.pickMin > 0
        ? blueprint.choice.pickMin
        : null;

  const tour = findTour(anchorTourId);
  const maxStops = REGION_RULES[tourRegionKey(tour?.region ?? null)]?.maxStops ?? null;

  return {
    provable: poolLabels.length > 0 || coreLabels.length > 0 || tableLabels.length > 0,
    tableLabels,
    poolLabels,
    coreLabels,
    optionalLabels,
    pickMin,
    maxStops,
  };
}

/** Classify one authored label against the anchor's structural authorities. */
function classify(label: string, structure: AnchorStructure): StructuralRole {
  const best = (labels: string[]) => labels.reduce((max, l) => Math.max(max, matchScore(l, label)), 0);
  const scores: Array<[StructuralRole, number]> = [
    ["table", best(structure.tableLabels)],
    ["pool", best(structure.poolLabels)],
    ["core", best(structure.coreLabels)],
    ["optional", best(structure.optionalLabels)],
  ];
  let role: StructuralRole = "unknown";
  let top = 0;
  for (const [candidate, score] of scores) {
    if (score > top) {
      top = score;
      role = candidate;
    }
  }
  return top > 0 ? role : "unknown";
}

/* ── public API ─────────────────────────────────────────────── */

/** Canonical number of pool picks the base product actually includes. */
export function anchorWineryPickMin(anchorTourId: string | null | undefined): number | null {
  return anchorStructure(anchorTourId).pickMin;
}

/** Hard operational cap (region rules) that the fallback must respect. */
export function anchorMaxStops(anchorTourId: string | null | undefined): number | null {
  return anchorStructure(anchorTourId).maxStops;
}

export interface AuthoredAnchorProjection<T> {
  /** The canonical operational day. */
  readonly points: T[];
  /** Labels removed from the raw catalogue. Diagnostics only. */
  readonly droppedLabels: string[];
  /** True when the raw list had to be projected. */
  readonly projected: boolean;
  /** False when no structural authority describes this anchor. */
  readonly provable: boolean;
}

/**
 * Project an authored anchor stop list onto its canonical operational day.
 * Generic over any object carrying a `label`; identity fields untouched.
 */
export function projectAuthoredAnchorStops<T extends { label: string }>(
  anchorTourId: string | null | undefined,
  points: ReadonlyArray<T>,
): AuthoredAnchorProjection<T> {
  const structure = anchorStructure(anchorTourId);
  if (!structure.provable || points.length === 0) {
    return { points: [...points], droppedLabels: [], projected: false, provable: false };
  }

  const roles = points.map((p) => classify(p.label, structure));
  const cap = structure.maxStops ?? points.length;
  const pickMin = structure.pickMin;

  const keep = new Set<number>();
  const take = (index: number) => {
    keep.add(index);
  };

  // 1 · the included table/lunch moment — commercial truth, never dropped.
  const tableIndexes = points.map((_, i) => i).filter((i) => roles[i] === "table");
  if (tableIndexes.length > 0) take(tableIndexes[0]!);

  // 2 · exactly the included number of pool candidates, authored order.
  const poolIndexes = points.map((_, i) => i).filter((i) => roles[i] === "pool");
  const poolQuota = pickMin ?? poolIndexes.length;
  for (const index of poolIndexes.slice(0, poolQuota)) take(index);

  // 3 · remaining core moments, authored order, while the cap allows.
  for (const index of points.map((_, i) => i).filter((i) => roles[i] === "core")) {
    if (keep.size >= cap) break;
    take(index);
  }

  // 4 · unclassified moments only if the canonical day still has room.
  for (const index of points.map((_, i) => i).filter((i) => roles[i] === "unknown")) {
    if (keep.size >= cap) break;
    take(index);
  }

  // 5 · optional / pass-by / origin never join the canonical base day,
  //     unless nothing else could be proven at all (empty day guard).
  if (keep.size === 0) {
    return { points: [...points], droppedLabels: [], projected: false, provable: true };
  }

  const kept = points.filter((_, i) => keep.has(i));
  const droppedLabels = points.filter((_, i) => !keep.has(i)).map((p) => p.label);
  return {
    points: kept,
    droppedLabels,
    projected: droppedLabels.length > 0,
    provable: true,
  };
}
