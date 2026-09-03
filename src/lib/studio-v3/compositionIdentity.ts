/**
 * compositionIdentity — BUILD 1 / Pass 4.
 *
 * Pure, deterministic resolution of a composed moment into the THREE stable
 * id spaces the rest of the system already owns:
 *
 *   1. `inventoryStopId`  — `REGION_STOP_POOL` (`OptionalStop.id`)
 *   2. `blueprintStopId`  — `TAILOR_BLUEPRINTS` (`BlueprintStop.id`)
 *   3. `commercialId`     — the identity a commercial rule can be attached to.
 *                           Today that is exactly the blueprint stop id; there
 *                           is no other structural commercial identity in the
 *                           repository, and none is invented here.
 *
 * Hard rules:
 *  - NO copied `tourId + label -> id` truth table. Candidates are derived only
 *    from existing structural data, scoped by the anchor Signature.
 *  - A normalized label is allowed ONLY as a final discriminator INSIDE that
 *    already-scoped candidate set. It is a documented migration boundary for
 *    legacy label-only Signature stops, never a global matcher.
 *  - Multiple candidates => `ambiguous`. Nothing is silently chosen.
 *  - Zero candidates => `unresolved`.
 *  - Downstream semantics/commerce must read the resolved ids, never labels.
 */

import { REGION_STOP_POOL, type OptionalStop } from "@/data/regionStopPool";
import { bridgedBlueprintStopId } from "@/data/structuralStopBridge";
import { getTailorBlueprint, type BlueprintStop } from "@/data/tailorBlueprints";
import { signatureTours } from "@/data/signatureTours";
import {
  ADD_ON_CATALOG,
  deriveAnchorStop,
  isAddOnStructurallyEligible,
  regionBucket,
} from "@/data/signatureAddOns";

export type IdentityConfidence = "verified" | "ambiguous" | "unresolved";

export type IdentitySource =
  | "composer-inventory-id"
  | "blueprint-id"
  | "scoped-label-inventory"
  | "scoped-label-blueprint"
  | "none";

export type CompositionIdentityRecord = {
  /** Position in the composed order. Provenance only — never an identity. */
  slot: number;
  /** Display label AT RESOLUTION TIME. Provenance only. */
  label: string;
  inventoryStopId: string | null;
  blueprintStopId: string | null;
  /** Commercial action identity. Null when no structural rule can attach. */
  commercialId: string | null;
  confidence: IdentityConfidence;
  source: IdentitySource;
  candidateInventoryStopIds: string[];
  candidateBlueprintStopIds: string[];
};

export type CompositionIdentityInput = {
  label: string;
  /** Known inventory id (composer output). */
  inventoryStopId?: string | null;
  /** Known blueprint id, when the caller already has structural truth. */
  blueprintStopId?: string | null;
};

export type CompositionIdentityReport = {
  records: CompositionIdentityRecord[];
  /** Labels that resolved to nothing at all — the measurable legacy gap. */
  residualUnresolvedLabels: string[];
  /** Labels with >1 in-scope candidate — never silently picked. */
  residualAmbiguousLabels: string[];
  /** Moments with no commercial identity — force a fail-closed ledger. */
  residualCommerciallyUnidentifiedLabels: string[];
  /** Diagnostics — measurable, never used to soften a gate. */
  totalCount: number;
  verifiedCount: number;
  ambiguousCount: number;
  unresolvedCount: number;
  blueprintIdentifiedCount: number;
  commercialIdentifiedCount: number;
  structuralCoverageRatio: number;
  blueprintCoverageRatio: number;
  commercialCoverageRatio: number;
};


export function normalizeIdentityLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stopSourceTourIds(stop: OptionalStop): string[] {
  return [
    ...new Set([stop.signatureTourId, ...(stop.sourceTourIds ?? [])].filter(Boolean)),
  ] as string[];
}

/** Inventory candidates scoped to the anchor Signature and its route clusters. */
export function scopedInventoryCandidates(
  anchorTourId: string,
  pool: readonly OptionalStop[] = REGION_STOP_POOL,
): OptionalStop[] {
  const anchors = pool.filter(
    (stop) => stop.active && stopSourceTourIds(stop).includes(anchorTourId),
  );
  if (anchors.length === 0) return [];
  const regions = new Set(anchors.map((stop) => stop.region));
  const clusters = new Set(
    anchors.map((stop) => stop.routeCluster).filter((value): value is string => Boolean(value)),
  );
  return pool.filter((stop) => {
    if (!stop.active) return false;
    if (!regions.has(stop.region)) return false;
    if (stopSourceTourIds(stop).includes(anchorTourId)) return true;
    return Boolean(stop.routeCluster && clusters.has(stop.routeCluster));
  });
}

/** Blueprint candidates for the anchor Signature: core + choice + optional. */
export function scopedBlueprintCandidates(anchorTourId: string): BlueprintStop[] {
  const blueprint = getTailorBlueprint(anchorTourId);
  if (!blueprint) return [];
  return [...blueprint.core, ...(blueprint.choice?.options ?? []), ...blueprint.optional];
}

function matchByLabel<T>(
  candidates: readonly T[],
  label: string,
  labelOf: (item: T) => string,
): T[] {
  const key = normalizeIdentityLabel(label);
  if (!key) return [];
  return candidates.filter((item) => normalizeIdentityLabel(labelOf(item)) === key);
}

export function resolveCompositionIdentity(input: {
  anchorTourId: string;
  slot: number;
  moment: CompositionIdentityInput;
  pool?: readonly OptionalStop[];
}): CompositionIdentityRecord {
  const pool = input.pool ?? REGION_STOP_POOL;
  const inventoryScope = scopedInventoryCandidates(input.anchorTourId, pool);
  const blueprintScope = scopedBlueprintCandidates(input.anchorTourId);
  const label = input.moment.label;

  let inventoryStopId: string | null = null;
  let blueprintStopId: string | null = null;
  let source: IdentitySource = "none";
  let confidence: IdentityConfidence = "unresolved";

  const candidateInventoryStopIds: string[] = [];
  const candidateBlueprintStopIds: string[] = [];

  // 1 · Existing structural id carried by the caller (composer output).
  const knownInventoryId = input.moment.inventoryStopId ?? null;
  if (knownInventoryId && pool.some((stop) => stop.id === knownInventoryId)) {
    inventoryStopId = knownInventoryId;
    source = "composer-inventory-id";
    confidence = "verified";
  }

  const knownBlueprintId = input.moment.blueprintStopId ?? null;
  if (knownBlueprintId && blueprintScope.some((stop) => stop.id === knownBlueprintId)) {
    blueprintStopId = knownBlueprintId;
    if (source === "none") {
      source = "blueprint-id";
      confidence = "verified";
    }
  }

  // 1b · DECLARED structural bridge between the inventory and blueprint id
  // spaces for this exact anchor. Not a label guess: an explicit, reviewed
  // statement that the two catalogues describe the same real moment.
  if (!blueprintStopId && inventoryStopId) {
    const bridged = bridgedBlueprintStopId(input.anchorTourId, inventoryStopId);
    if (bridged && blueprintScope.some((stop) => stop.id === bridged)) {
      blueprintStopId = bridged;
      if (source === "none") source = "blueprint-id";
      if (confidence === "unresolved") confidence = "verified";
    }
  }


  // 2 · Label discriminator INSIDE the already-scoped inventory set.
  if (!inventoryStopId) {
    const matches = matchByLabel(inventoryScope, label, (stop) => stop.name);
    candidateInventoryStopIds.push(...matches.map((stop) => stop.id));
    if (matches.length === 1) {
      inventoryStopId = matches[0].id;
      source = "scoped-label-inventory";
      confidence = "verified";
    } else if (matches.length > 1) {
      confidence = "ambiguous";
    }
  }

  // 2b · DECLARED bridge again, now that step 2 may have resolved the
  // inventory id from the label. Without this, a composed moment whose
  // structural id was recovered by label kept a null blueprint id and the
  // commercial ledger saw the anchor's own core stop as both an unattributed
  // sibling and an omitted core lock. Same declared bridge, no new guessing.
  if (!blueprintStopId && inventoryStopId) {
    const bridged = bridgedBlueprintStopId(input.anchorTourId, inventoryStopId);
    if (bridged && blueprintScope.some((stop) => stop.id === bridged)) {
      blueprintStopId = bridged;
      if (source === "none") source = "blueprint-id";
      if (confidence === "unresolved") confidence = "verified";
    }
  }



  // 3 · Label discriminator INSIDE the already-scoped blueprint set.
  if (!blueprintStopId) {
    const matches = matchByLabel(blueprintScope, label, (stop) => stop.label);
    candidateBlueprintStopIds.push(...matches.map((stop) => stop.id));
    if (matches.length === 1) {
      blueprintStopId = matches[0].id;
      if (source === "none") source = "scoped-label-blueprint";
      if (confidence === "unresolved") confidence = "verified";
    } else if (matches.length > 1 && confidence === "unresolved") {
      confidence = "ambiguous";
    }
  }

  if (inventoryStopId || blueprintStopId) {
    if (confidence !== "ambiguous") confidence = "verified";
  }

  return {
    slot: input.slot,
    label,
    inventoryStopId,
    blueprintStopId,
    // COMMERCIAL-ACTION IDENTITY IS A DISTINCT SPACE. A structural blueprint id
    // is NOT a commercial action: it only proves what the anchor already
    // contains. A commercial id exists only when an EXISTING commercial action
    // authority (the add-on catalogue) structurally attaches to this exact stop
    // for this exact anchor. No label matching, no aliasing, no invention.
    commercialId:
      confidence === "ambiguous"
        ? null
        : resolveCommercialActionId(input.anchorTourId, { inventoryStopId, blueprintStopId }),
    confidence,
    source,
    candidateInventoryStopIds: [...new Set(candidateInventoryStopIds)].sort(),
    candidateBlueprintStopIds: [...new Set(candidateBlueprintStopIds)].sort(),
  };
}

/**
 * Resolve an EXACT existing commercial action id for a structurally identified
 * moment. Uses the current add-on catalogue authority only:
 *  - the add-on must declare an explicit `anchorStopKey` equal to one of the
 *    resolved structural ids (never a label, never a type/duration similarity);
 *  - the add-on must be structurally eligible for this anchor Signature;
 *  - more than one match is ambiguity, so nothing is chosen.
 *
 * Returns null whenever no such rule exists. That is the intended fail-closed
 * outcome, not a gap to be papered over downstream.
 */
export function resolveCommercialActionId(
  anchorTourId: string,
  ids: { inventoryStopId: string | null; blueprintStopId: string | null },
): string | null {
  const keys = new Set([ids.inventoryStopId, ids.blueprintStopId].filter(Boolean) as string[]);
  if (keys.size === 0) return null;
  const tour = signatureTours.find((candidate) => candidate.id === anchorTourId) ?? null;
  if (!tour) return null;
  const catalogue = ADD_ON_CATALOG[regionBucket(tour.region)] ?? [];
  const matches = catalogue.filter((addOn) => {
    const anchorStop = deriveAnchorStop(addOn);
    if (!anchorStop.stopKey || !keys.has(anchorStop.stopKey)) return false;
    return isAddOnStructurallyEligible(addOn, tour);
  });
  return matches.length === 1 ? matches[0].id : null;
}

export function resolveCompositionIdentities(input: {
  anchorTourId: string;
  moments: ReadonlyArray<CompositionIdentityInput>;
  pool?: readonly OptionalStop[];
}): CompositionIdentityReport {
  const records = input.moments.map((moment, slot) =>
    resolveCompositionIdentity({
      anchorTourId: input.anchorTourId,
      slot,
      moment,
      pool: input.pool,
    }),
  );

  const total = records.length;
  const verifiedCount = records.filter((record) => record.confidence === "verified").length;
  const ambiguousCount = records.filter((record) => record.confidence === "ambiguous").length;
  const unresolvedCount = records.filter((record) => record.confidence === "unresolved").length;
  const blueprintIdentifiedCount = records.filter(
    (record) => record.blueprintStopId !== null,
  ).length;
  const commercialIdentifiedCount = records.filter((record) => record.commercialId !== null).length;
  const ratio = (count: number): number => (total === 0 ? 1 : count / total);

  return {
    records,
    residualUnresolvedLabels: records
      .filter((record) => record.confidence === "unresolved")
      .map((record) => record.label),
    residualAmbiguousLabels: records
      .filter((record) => record.confidence === "ambiguous")
      .map((record) => record.label),
    residualCommerciallyUnidentifiedLabels: records
      .filter((record) => record.commercialId === null)
      .map((record) => record.label),
    totalCount: total,
    verifiedCount,
    ambiguousCount,
    unresolvedCount,
    blueprintIdentifiedCount,
    commercialIdentifiedCount,
    structuralCoverageRatio: ratio(verifiedCount),
    blueprintCoverageRatio: ratio(blueprintIdentifiedCount),
    commercialCoverageRatio: ratio(commercialIdentifiedCount),
  };
}

