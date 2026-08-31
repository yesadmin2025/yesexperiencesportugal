/**
 * liveCommercialAuthority — ONE rebuild of commercial truth from the EXACT
 * route the traveller is looking at right now.
 *
 * The bug this closes: the checkout path used to read a `CommercialLedger`
 * that had been resolved BEFORE the traveller's Add / Swap / Remove /
 * Reorder / Undo edits. A stale ledger can carry actions for moments that no
 * longer exist and can miss actions the current day does trigger.
 *
 * This module rebuilds, at the moment of Reserve:
 *   1. the composition identity report for the current authored moments,
 *      preferring the structural ids the route point already carries
 *      (`inventoryStopId` / `blueprintStopId`) over any label discriminator;
 *   2. the omitted anchor blueprint records, derived STRUCTURALLY (blueprint
 *      core + choice stops whose ids are not kept), never from labels;
 *   3. the `CommercialLedger` for that exact pair.
 *
 * It reads no euros, computes no euros and returns no euros. The server /
 * catalogue pricing authority stays sovereign.
 *
 * Pure, synchronous, deterministic. No React, no fetch.
 */

import {
  normalizeIdentityLabel,
  resolveCompositionIdentities,
  scopedBlueprintCandidates,
  type CompositionIdentityRecord,
  type CompositionIdentityReport,
} from "./compositionIdentity";
import { buildCommercialLedger, isKnownPriceAction, type CommercialLedger } from "./commercialLedger";
import { getTailorBlueprint } from "@/data/tailorBlueprints";

/** A moment of the CURRENT authored route, as the traveller sees it. */
export interface AuthoredCommercialMoment {
  readonly label: string;
  readonly inventoryStopId?: string | null;
  readonly blueprintStopId?: string | null;
}

export type LiveCommercialUnsafeReason =
  | "empty-composition"
  | "ambiguous-identity"
  | "unresolved-identity"
  | "commercial-unresolved"
  | "not-evaluable"
  | "requires-confirmation"
  | "unknown-price-action"
  | "structurally-invalid";

export interface LiveCommercialAuthorityResult {
  readonly anchorTourId: string | null;
  /** Null when the anchor declares no structural blueprint (legacy anchors). */
  readonly ledger: CommercialLedger | null;
  readonly report: CompositionIdentityReport | null;
  /**
   * Whether the composed day (vs the untouched anchor) is what is being sold.
   * Mirrors the existing `livingAtlasLive.liveResolution` vocabulary.
   */
  readonly liveResolution: "composed" | "authored-fallback";
  /**
   * Structural identity of each moment, in order. A real id wherever one
   * exists; a scoped `label:` key only as the documented legacy migration
   * boundary. This is the composition key material — never a bare label.
   */
  readonly identityKeys: string[];
  /** True when the ledger could be evaluated at all (anchor has a blueprint). */
  readonly evaluable: boolean;
  readonly safe: boolean;
  readonly unsafeReason: LiveCommercialUnsafeReason | null;
  readonly notes: string[];
}

function identityKey(record: CompositionIdentityRecord): string {
  if (record.blueprintStopId) return `bp:${record.blueprintStopId}`;
  if (record.inventoryStopId) return `inv:${record.inventoryStopId}`;
  // Legacy migration boundary only — never a commercial identity.
  return `label:${normalizeIdentityLabel(record.label)}`;
}

/**
 * Derive the anchor blueprint stops that the current route OMITS, purely
 * structurally: every core / choice blueprint stop whose id is not kept.
 * Optional blueprint stops are not omissions — they were never promised.
 */
function omittedAnchorRecords(
  anchorTourId: string,
  keptRecords: ReadonlyArray<CompositionIdentityRecord>,
): CompositionIdentityRecord[] {
  const blueprint = getTailorBlueprint(anchorTourId);
  if (!blueprint) return [];
  const keptBlueprintIds = new Set(
    keptRecords.map((r) => r.blueprintStopId).filter((id): id is string => Boolean(id)),
  );
  const scope = scopedBlueprintCandidates(anchorTourId);
  const promised = [...blueprint.core, ...(blueprint.choice?.options ?? [])];
  const out: CompositionIdentityRecord[] = [];
  let slot = keptRecords.length;
  for (const stop of promised) {
    if (keptBlueprintIds.has(stop.id)) continue;
    if (!scope.some((candidate) => candidate.id === stop.id)) continue;
    out.push({
      slot: slot++,
      label: stop.label,
      inventoryStopId: null,
      blueprintStopId: stop.id,
      commercialId: null,
      confidence: "verified",
      source: "blueprint-id",
      candidateInventoryStopIds: [],
      candidateBlueprintStopIds: [],
    });
  }
  return out;
}

export function rebuildLiveCommercialAuthority(input: {
  anchorTourId: string | null;
  moments: ReadonlyArray<AuthoredCommercialMoment>;
  /** True when the traveller changed the day away from the anchor composition. */
  edited: boolean;
}): LiveCommercialAuthorityResult {
  const anchorTourId = input.anchorTourId ?? null;
  const liveResolution: "composed" | "authored-fallback" = input.edited
    ? "composed"
    : "authored-fallback";
  const notes: string[] = [];

  if (!anchorTourId) {
    return {
      anchorTourId: null,
      ledger: null,
      report: null,
      liveResolution,
      identityKeys: [],
      evaluable: false,
      safe: false,
      unsafeReason: "empty-composition",
      notes: ["no-anchor-tour"],
    };
  }

  const moments = input.moments.filter((m) => m.label && m.label.trim().length > 0);
  if (moments.length === 0) {
    return {
      anchorTourId,
      ledger: null,
      report: null,
      liveResolution,
      identityKeys: [],
      evaluable: false,
      safe: false,
      unsafeReason: "empty-composition",
      notes: ["empty-composition"],
    };
  }

  const report = resolveCompositionIdentities({
    anchorTourId,
    moments: moments.map((m) => ({
      label: m.label,
      inventoryStopId: m.inventoryStopId ?? null,
      blueprintStopId: m.blueprintStopId ?? null,
    })),
  });

  const identityKeys = report.records.map(identityKey);
  const hasBlueprint = Boolean(getTailorBlueprint(anchorTourId));

  if (!hasBlueprint) {
    // Legacy anchor with no structural blueprint: there is nothing to rebuild
    // and nothing new to prove. The existing anchor pricing authority owns
    // the day exactly as it does today. Reported, never silently "safe-ified".
    notes.push("no-structural-blueprint-for-anchor");
    return {
      anchorTourId,
      ledger: null,
      report,
      liveResolution,
      identityKeys,
      evaluable: false,
      // An UNEDITED canonical anchor keeps the sovereign anchor-pricing path,
      // but only when identity is unambiguous and fully resolved. Any edited
      // or composed day with no structural authority is NOT bookable.
      // No blueprint exists, so structural resolution is impossible by
      // definition; only genuine identity AMBIGUITY disqualifies the anchor.
      safe: report.ambiguousCount === 0 && liveResolution === "authored-fallback",
      unsafeReason:
        report.ambiguousCount > 0
          ? "ambiguous-identity"
          : liveResolution === "composed"
            ? "not-evaluable"
            : null,
      notes,
    };
  }

  const omitted = omittedAnchorRecords(anchorTourId, report.records);
  const ledger = buildCommercialLedger({
    anchorTourId,
    kept: report.records,
    omitted,
  });
  notes.push(...ledger.notes);

  let unsafeReason: LiveCommercialUnsafeReason | null = null;
  if (report.ambiguousCount > 0) unsafeReason = "ambiguous-identity";
  else if (liveResolution === "composed" && report.unresolvedCount > 0)
    unsafeReason = "unresolved-identity";
  else if (liveResolution === "composed" && ledger.disposition === "commercial-unresolved")
    unsafeReason = "commercial-unresolved";
  else if (
    liveResolution === "composed" &&
    ledger.entries.some((entry) => entry.priceAction === "requires-confirmation")
  )
    unsafeReason = "requires-confirmation";
  else if (
    liveResolution === "composed" &&
    ledger.actions.some((action) => !isKnownPriceAction(action.priceAction))
  )
    unsafeReason = "unknown-price-action";
  else if (liveResolution === "composed" && ledger.entries.some((entry) => !entry.structuralValid))
    unsafeReason = "structurally-invalid";

  return {
    anchorTourId,
    ledger,
    report,
    liveResolution,
    identityKeys,
    evaluable: true,
    safe: unsafeReason === null,
    unsafeReason,
    notes,
  };
}
