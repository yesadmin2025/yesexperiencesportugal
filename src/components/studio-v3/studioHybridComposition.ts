/**
 * studioHybridComposition — POLICY / PROJECTION ADAPTER around the single
 * composition authority `composeLivingAtlasDay()`.
 *
 * BUILD 1 / Pass 3. This module is NOT a second composer. It holds no
 * scoring, no admission rule, no time model and no count rule. It:
 *   1. classifies the authored skeleton points and the traveller's explicit
 *      obligations,
 *   2. calls `composeLivingAtlasDay()` once,
 *   3. projects the resulting real moments back onto route points.
 *
 * Binding Studio rules encoded here:
 *  - SIGNATURE = operational skeleton, NEVER the final result. A generic
 *    Signature core/supporting moment is a candidate/default, not sacred: it
 *    may be omitted, replaced or reorganised.
 *  - Only EXPLICIT traveller obligations (principal / must-include) and
 *    verified mandatory operational nodes are protected.
 *  - TIME is the authority. `maxPoints` is deprecated and behaviour-free.
 *  - Region / route cluster containment, one-of groups, type caps, active
 *    state and `sourceTourIds` provenance all come from the composer and are
 *    never re-decided here.
 *  - Pure and deterministic: no pricing, no add-ons, no persistence, no I/O.
 */

import { REGION_STOP_POOL, type OptionalStop, type OptionalStopType } from "@/data/regionStopPool";
import { isStopClosedOn } from "@/data/stopOperational";
import { deriveLivingAtlasDimensions } from "@/components/studio-v3/livingAtlasInventory";
import {
  composeLivingAtlasDay,
  type LivingAtlasComposition,
} from "@/components/studio-v3/livingAtlasComposer";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import { buildExperienceProfile } from "@/lib/studio-v3/livingAtlasBridge";
import type { ResolvedRoutePoint } from "@/components/studio-v3/curation";
import type { Feeling, Interest, Rhythm } from "@/components/studio-v3/types";
import type { ResolvedTimeBudget } from "@/lib/studio-v3/timeDomain";
import { resolveTimeBudget } from "@/lib/studio-v3/resolveTimeBudget";


/**
 * Hybrid role of a moment — describes USER / OPERATIONAL importance, never
 * inherited Signature status.
 */
export type HybridMomentRole =
  | "principal"
  | "required-operational"
  | "supporting"
  | "filler"
  | "replacement"
  | "omitted"
  /** Internal only: an authored skeleton default. NEVER means protected. */
  | "skeleton-default";

export interface HybridCompositionInput {
  /** Internal Signature anchor id (pricing / geography). Never shown. */
  skeletonTourId: string | null | undefined;
  feeling: Feeling | null;
  interests: ReadonlyArray<Interest>;
  rhythm: Rhythm;
  /** Explicit wine intent — gates winery moments. */
  wineIntent?: boolean;
  /** ISO yyyy-mm-dd — keeps operationally closed moments out. */
  dateExact?: string | null;
  /**
   * @deprecated BUILD 1 / Pass 3 — BEHAVIOUR-FREE. Retained only so existing
   * callers (curation.ts, until Pass 4) keep type-checking. It never affects
   * composition membership, ordering or length. Time is the only authority.
   */
  maxPoints?: number;
  /** Explicit traveller-chosen defining experiences — protected obligations. */
  principalStopIds?: ReadonlyArray<string>;
  /** Explicit traveller-required activity types — protected obligations. */
  requiredTypes?: ReadonlyArray<OptionalStopType>;
  /**
   * Verified mandatory operational nodes (required ferry/transfer, pickup).
   * Matched against authored point labels; protected from omission.
   */
  mandatoryOperationalLabels?: ReadonlyArray<string>;
  /** Explicit truthful time budget. Absent → resolved from the skeleton. */
  timeBudget?: ResolvedTimeBudget;
  /**
   * VERIFIED mandatory connector minutes (e.g. the Sado ferry crossing, whose
   * 30 minutes are structural truth in `tailorBlueprints`). This is INTERNAL
   * TRANSIT, never experience dwell: it is withheld from the experience budget
   * so the composer can never spend it on an attraction.
   */
  internalTransitMinutes?: number;
  /** Connectors with no verified duration — recorded, never guessed. */
  unverifiedConnectorLabels?: ReadonlyArray<string>;
  /**
   * Traveller mobility/accessibility concern. No structured accessibility
   * field exists in current inventory, so this can NEVER remove or replace a
   * moment; it only raises an internal review issue.
   */
  mobilityConcern?: boolean;
  /**
   * Door-to-door planning origin handed to the composer so the owner's
   * 540-minute pickup → drop-off ceiling governs admission. Absent → the
   * composition is reported door-to-door UNCERTIFIED, never certified.
   */
  pickupCoord?: { lat: number; lng: number } | null;
  /**
   * Customer-facing blurb builder for an inserted moment. Injected by the
   * caller (production passes `customerStopBlurb`) so this module never
   * imports back into `curation.ts`.
   */
  buildStory?: (stop: OptionalStop) => string;
}


export type HybridProjectedMoment = {
  stopId: string | null;
  label: string;
  role: HybridMomentRole;
  /** Authored skeleton point this moment replaced, when it replaced one. */
  replacedLabel: string | null;
  sourceTourIds: string[];
};

/**
 * EXPLICIT, branch-grounded reason a hybrid day was not projected. Never
 * inferred later from `composition.status` — each value is written at the
 * exact branch that produced it.
 */
export type HybridPassthroughReason =
  | "empty-authored"
  | "invalid-anchor"
  | "thin-profile"
  | "composition-empty"
  | "composition-tradeoff"
  | "composition-partial"
  | "composition-impossible"
  | "composition-invalid"
  | "date-closure";

/** Internal, non-public pre/post-validation signal. Never a membership change. */
export type HybridInternalIssue = {
  code: "mobility-unproven" | "connector-unverified";
  detail: string;
  stopIds?: string[];
};

export type HybridCompositionResult = {
  points: ResolvedRoutePoint[];
  moments: HybridProjectedMoment[];
  /** Authored skeleton defaults dropped because time/priority did not keep them. */
  omitted: HybridProjectedMoment[];
  composition: LivingAtlasComposition | null;
  /** True when the adapter could not run and returned the authored points. */
  passthrough: boolean;
  /** Deterministic reason for `passthrough`. Null only when genuinely composed. */
  passthroughReason: HybridPassthroughReason | null;
  /** Verified mandatory connector minutes withheld from the experience budget. */
  internalTransitMinutes: number;
  /** Internal review signals — never a silent removal or replacement. */
  internalIssues: HybridInternalIssue[];
};


function isLivingAtlasSignatureId(id: string): id is LivingAtlasSignatureId {
  return (LIVING_ATLAS_SIGNATURE_IDS as ReadonlyArray<string>).includes(id);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function densityForRhythm(rhythm: Rhythm): "slow" | "balanced" | "rich" {
  if (rhythm === "slow") return "slow";
  if (rhythm === "balanced") return "balanced";
  return "rich";
}

function stopProvenance(stop: OptionalStop): string[] {
  return [...new Set([stop.signatureTourId, ...(stop.sourceTourIds ?? [])].filter(Boolean))] as string[];
}

/**
 * Withhold VERIFIED mandatory connector minutes from the experience envelope.
 *
 * The connector is transit, not an attraction: its minutes exist in the day but
 * can never be spent on dwell. The envelope (target, min, max) shrinks by the
 * same verified amount so the time authority stays truthful. No duration is
 * ever invented — callers pass only minutes proven by structural product truth.
 */
function withInternalTransit(
  explicit: ResolvedTimeBudget | undefined,
  anchorId: string,
  transitMinutes: number,
): ResolvedTimeBudget {
  const base = explicit ?? resolveTimeBudget({ skeletonTourId: anchorId });
  if (transitMinutes <= 0) return base;
  return {
    ...base,
    availableExperienceMinutes: Math.max(
      0,
      base.availableExperienceMinutes - transitMinutes,
    ),
    minMinutes: Math.max(0, base.minMinutes - transitMinutes),
    maxMinutes: Math.max(0, base.maxMinutes - transitMinutes),
    notes: [base.notes, `internal-transit-withheld:${transitMinutes}`]
      .filter(Boolean)
      .join(" · "),
  };
}


/**
 * Classify authored points against real inventory.
 *
 * A point that maps to a verified pool stop is a SKELETON DEFAULT: it is a
 * candidate the composer may keep, replace or omit. A point with no inventory
 * match cannot be proven generic (pickup, transfer, narrative node), so it is
 * conservatively treated as operational and preserved.
 */
function classifyAuthoredPoints(
  points: ReadonlyArray<ResolvedRoutePoint>,
  pool: readonly OptionalStop[],
  mandatoryLabels: ReadonlyArray<string>,
): Array<{ point: ResolvedRoutePoint; stop: OptionalStop | null; mandatory: boolean }> {
  const mandatory = new Set(mandatoryLabels.map(normalize));
  return points.map((point) => {
    const key = normalize(point.label);
    const stop = pool.find((candidate) => normalize(candidate.name) === key) ?? null;
    return { point, stop, mandatory: mandatory.has(key) };
  });
}

/**
 * Run the single composition authority and project its real moments onto the
 * authored route. Returns a NEW array; input is never mutated.
 */
export function composeHybridDay(
  points: ReadonlyArray<ResolvedRoutePoint>,
  input: HybridCompositionInput,
): HybridCompositionResult {
  const authored = points.map((p) => ({ ...p }));
  const internalTransitMinutes = Math.max(0, Math.round(input.internalTransitMinutes ?? 0));
  const internalIssues: HybridInternalIssue[] = [];

  if (input.mobilityConcern) {
    // No structured accessibility capability exists in current inventory, so
    // incompatibility CANNOT be proven. Membership is preserved and the day is
    // sent to review instead of being silently reshaped.
    internalIssues.push({
      code: "mobility-unproven",
      detail:
        "A mobility consideration was declared, but no structured accessibility field proves any moment is incompatible. Membership is unchanged and the day needs human review.",
    });
  }
  for (const label of input.unverifiedConnectorLabels ?? []) {
    internalIssues.push({
      code: "connector-unverified",
      detail: `Connector "${label}" has no verified duration, so no transit minutes were assumed.`,
    });
  }

  const passthrough = (reason: HybridPassthroughReason): HybridCompositionResult => ({
    points: authored.map((p, i) => ({ ...p, index: i })),
    moments: authored.map((p) => ({
      stopId: null,
      label: p.label,
      role: "skeleton-default" as HybridMomentRole,
      replacedLabel: null,
      sourceTourIds: [],
    })),
    omitted: [],
    composition: null,
    passthrough: true,
    passthroughReason: reason,
    internalTransitMinutes,
    internalIssues,
  });

  if (authored.length === 0) return passthrough("empty-authored");

  const anchorId = input.skeletonTourId ?? null;
  if (!anchorId || !isLivingAtlasSignatureId(anchorId)) return passthrough("invalid-anchor");

  const profile = buildExperienceProfile({
    feeling: input.feeling,
    interests: input.interests,
  });
  if (!profile) return passthrough("thin-profile");

  const pool = REGION_STOP_POOL;
  const classified = classifyAuthoredPoints(
    authored,
    pool,
    input.mandatoryOperationalLabels ?? [],
  );

  // ONLY explicit traveller obligations and VERIFIED mandatory operational
  // nodes are protected. Generic Signature core moments are deliberately NOT
  // promoted to mustInclude.
  const principalStopIds = [...new Set(input.principalStopIds ?? [])].filter((stopId) =>
    pool.some((stop) => stop.id === stopId),
  );

  // Mandatory operational labels that match a real pool stop must go THROUGH
  // the time authority, not around it: they enter the same must-include set so
  // they consume truthful time and can create a Pass-2 tradeoff.
  //
  // Mandatory connector nodes with NO inventory identity (ferry, pickup) are
  // never attractions: their verified minutes arrive as `internalTransitMinutes`
  // and are withheld from the experience budget below. Unverified connectors
  // get no guessed duration at all.
  const matchedOperationalStopIds = [
    ...new Set(
      classified
        .filter((entry) => entry.mandatory && entry.stop)
        .map((entry) => entry.stop!.id)
        .filter((stopId) => !principalStopIds.includes(stopId)),
    ),
  ];

  const mustIncludeStopIds = [...principalStopIds, ...matchedOperationalStopIds];

  const timeBudget = withInternalTransit(input.timeBudget, anchorId, internalTransitMinutes);

  const composition = composeLivingAtlasDay({
    anchorSignatureId: anchorId,
    profile,
    density: densityForRhythm(input.rhythm),
    rhythm: input.rhythm,
    timeBudget,
    requiredTypes: [...(input.requiredTypes ?? [])],
    excludedTypes: input.wineIntent ? [] : ["winery"],
    mustIncludeStopIds,
    pickupCoord: input.pickupCoord ?? null,
  });

  // ONLY a COMPLETE composition may be projected as a finished hybrid day.
  // `tradeoff`, `partial`, `impossible` and `invalid` can all carry a non-empty
  // partially-selected set; projecting it would silently present an unresolved
  // obligation as resolved. The authored route is returned unchanged and the
  // truthful composition travels with an EXPLICIT passthrough reason.
  if (composition.moments.length === 0) {
    return { ...passthrough("composition-empty"), composition };
  }
  if (composition.status !== "complete") {
    const reason: HybridPassthroughReason =
      composition.status === "tradeoff"
        ? "composition-tradeoff"
        : composition.status === "partial"
          ? "composition-partial"
          : composition.status === "impossible"
            ? "composition-impossible"
            : "composition-invalid";
    return { ...passthrough(reason), composition };
  }

  // DATE CLOSURE is validation truth, never a silent membership mutation.
  // If any selected moment is closed on the requested date we do NOT project a
  // mutated subset: the authored route is returned unchanged and the full
  // truthful composition is preserved so the caller can still run route,
  // schedule and validation on the COMPLETE identity set.
  const dateExact = input.dateExact ?? null;
  if (composition.moments.some((moment) => isStopClosedOn(moment.label, dateExact))) {
    return { ...passthrough("date-closure"), composition };
  }


  const selectedIds = new Set(composition.moments.map((moment) => moment.stopId));
  const principalIds = new Set(principalStopIds);
  const operationalIds = new Set(matchedOperationalStopIds);
  const requiredTypes = new Set(input.requiredTypes ?? []);
  const stopById = new Map(pool.map((stop) => [stop.id, stop]));


  const out: ResolvedRoutePoint[] = [];
  const moments: HybridProjectedMoment[] = [];
  const omitted: HybridProjectedMoment[] = [];
  const emittedStopIds = new Set<string>();
  const omittedSlots: string[] = [];

  const roleFor = (stop: OptionalStop): HybridMomentRole => {
    // `required-operational` is reserved for verified mandatory operational
    // nodes only. A required TYPE is a traveller EXPERIENCE obligation.
    if (operationalIds.has(stop.id)) return "required-operational";
    if (principalIds.has(stop.id)) return "principal";
    if (requiredTypes.has(stop.type)) return "principal";
    const dimensions = deriveLivingAtlasDimensions({
      label: stop.name,
      intentionTags: stop.suitsInterests,
      capabilities: stop.capabilities ?? [],
    });
    if (dimensions.some((dimension) => profile.selected.includes(dimension))) return "supporting";
    return "filler";
  };


  // 1 · Walk the authored order. Unmatched operational nodes are preserved as
  //     pass-through; matched mandatory operational stops were sent through
  //     the composer and are kept only if the time authority kept them.
  for (const entry of classified) {
    if (!entry.stop) {
      out.push({ ...entry.point, index: out.length });
      moments.push({
        stopId: null,
        label: entry.point.label,
        role: entry.mandatory ? "required-operational" : "skeleton-default",
        replacedLabel: null,
        sourceTourIds: [],
      });
      continue;
    }

    if (entry.mandatory && !selectedIds.has(entry.stop.id)) {
      omitted.push({
        stopId: entry.stop.id,
        label: entry.point.label,
        role: "omitted",
        replacedLabel: null,
        sourceTourIds: stopProvenance(entry.stop),
      });
      continue;
    }


    if (selectedIds.has(entry.stop.id)) {
      // Structural inventory identity, proven by the pool match — never a
      // label/index derivation.
      out.push({ ...entry.point, inventoryStopId: entry.stop.id, index: out.length });
      moments.push({
        stopId: entry.stop.id,
        label: entry.point.label,
        role: roleFor(entry.stop),
        replacedLabel: null,
        sourceTourIds: stopProvenance(entry.stop),
      });
      emittedStopIds.add(entry.stop.id);
      continue;
    }

    // Generic skeleton default the time-authoritative composition did not
    // keep — omitted, and its slot may be taken by a real replacement.
    omittedSlots.push(entry.point.label);
    omitted.push({
      stopId: entry.stop.id,
      label: entry.point.label,
      role: "omitted",
      replacedLabel: null,
      sourceTourIds: stopProvenance(entry.stop),
    });
  }

  // 2 · Project composer moments that are not yet on the route.
  for (const moment of composition.moments) {
    if (emittedStopIds.has(moment.stopId)) continue;
    const stop = stopById.get(moment.stopId) ?? null;


    const replacedLabel = omittedSlots.shift() ?? null;
    const insertAt = Math.min(2, out.length);
    out.splice(insertAt, 0, {
      index: insertAt,
      inventoryStopId: moment.stopId,
      label: moment.label,
      story: stop && input.buildStory ? input.buildStory(stop) : "",
      lat: stop?.coords?.lat ?? null,
      lng: stop?.coords?.lng ?? null,
    });
    emittedStopIds.add(moment.stopId);
    moments.push({
      stopId: moment.stopId,
      label: moment.label,
      role: replacedLabel
        ? "replacement"
        : stop
          ? roleFor(stop)
          : "supporting",
      replacedLabel,
      sourceTourIds: [...moment.sourceTourIds],
    });
  }

  return {
    points: out.map((p, i) => ({ ...p, index: i })),
    moments,
    omitted,
    composition,
    passthrough: false,
    passthroughReason: null,
    internalTransitMinutes,
    internalIssues,
  };
}


/**
 * Production entry point. Thin wrapper over `composeHybridDay` so existing
 * callers keep their shape. `maxPoints` is accepted and ignored.
 */
export function applyHybridComposition(
  points: ReadonlyArray<ResolvedRoutePoint>,
  input: HybridCompositionInput,
): ResolvedRoutePoint[] {
  return composeHybridDay(points, input).points;
}
