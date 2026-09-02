/**
 * commercialLedger — BUILD 1 / Pass 4 · BLOCK B.
 *
 * A pure CLASSIFICATION / REFERENCE ledger with TWO INDEPENDENT AXES:
 *
 *   1. STRUCTURAL  — where a moment sits relative to the anchor blueprint
 *                    (`core | choice | optional | sibling | unresolved`),
 *                    resolved ONLY from `blueprintStopId` / verified
 *                    `inventoryStopId`. Never from labels, never from
 *                    `commercialId`.
 *   2. COMMERCIAL  — what EXISTING approved rule the moment triggers
 *                    (`priceAction` + `actionId`). Never euros.
 *
 * It is NOT a pricing engine:
 *  - it never computes, reads out, sums or returns euros;
 *  - it never mutates checkout, add-ons, membership or pricing inputs;
 *  - the server/current pricing modules stay sovereign.
 *
 * It FAILS CLOSED. Absence of a rule is never neutrality. Structural
 * optionality is never proof of free inclusion. Unknown identity always
 * degrades the whole composition to `commercial-unresolved`.
 */

import { getTailorBlueprint, type BlueprintStop } from "@/data/tailorBlueprints";
import { canSelectWineries, dedicatedLunchStopId, tailorRules } from "@/data/tailorRules";
import { classifyTailorCoreStop } from "@/data/tailorStopPricing";
import { ADD_ON_CATALOG, isAddOnStructurallyEligible, regionBucket } from "@/data/signatureAddOns";
import { signatureTours } from "@/data/signatureTours";
import type { CompositionIdentityRecord } from "@/lib/studio-v3/compositionIdentity";

/** LEGACY, DERIVED field. Never a source of truth — see the two axes below. */
export type CommercialClassification =
  | "anchor-included"
  | "neutral-replacement"
  | "paid-enhancement"
  | "removal-credit-eligible"
  | "requires-confirmation"
  | "commercial-unresolved";

export type CommercialDisposition =
  | "anchor-price-safe"
  | "known-price-action-required"
  | "commercial-unresolved";

/** STRUCTURAL AXIS — membership relative to the anchor blueprint. */
export type StructuralRole = "core" | "choice" | "optional" | "sibling" | "unresolved";

/** COMMERCIAL AXIS — the existing approved rule this moment triggers. */
export type PriceAction =
  | "none"
  | "principal-removal"
  | "dedicated-lunch-removal"
  | "extra-winery"
  | "signature-addon"
  | "requires-confirmation"
  | "unresolved";

/** Actions that are KNOWN, priced elsewhere by an existing authority. */
const KNOWN_PRICE_ACTIONS: ReadonlySet<PriceAction> = new Set<PriceAction>([
  "principal-removal",
  "dedicated-lunch-removal",
  "extra-winery",
  "signature-addon",
]);

/** True only for price actions an existing approved authority can price. */
export function isKnownPriceAction(action: PriceAction): boolean {
  return KNOWN_PRICE_ACTIONS.has(action);
}


export type CommercialLedgerEntry = {
  label: string;
  inventoryStopId: string | null;
  blueprintStopId: string | null;
  /** Raw commercial catalog identity carried by the resolved moment. */
  commercialId: string | null;
  kind: "kept" | "omitted";
  /* ---- structural axis ---- */
  structuralRole: StructuralRole;
  structuralValid: boolean;
  structuralNote: string | null;
  /* ---- commercial axis ---- */
  priceAction: PriceAction;
  /** Namespaced action identity, e.g. `tailor:principal-removal`, `addon:x`. */
  actionId: string | null;
  /** Identity of the EXISTING rule relied upon. Null when none exists. */
  rule: string | null;
  /** DERIVED legacy view of the two axes. Never source of truth. */
  classification: CommercialClassification;
};

/** Aggregate, quantity-bearing view of the commercial axis. NEVER euros. */
export type CommercialLedgerAction = {
  actionId: string;
  priceAction: PriceAction;
  quantity: number;
};

export type CommercialLedger = {
  anchorTourId: string;
  entries: CommercialLedgerEntry[];
  actions: CommercialLedgerAction[];
  disposition: CommercialDisposition;
  /** Structural notes for diagnostics. Never a euro value. */
  notes: string[];
};

type BlueprintIndex = {
  core: Map<string, BlueprintStop>;
  choice: Map<string, BlueprintStop>;
  optional: Map<string, BlueprintStop>;
  choicePick: { min: number; max: number } | null;
  hasBlueprint: boolean;
};

function blueprintIndex(anchorTourId: string): BlueprintIndex {
  const blueprint = getTailorBlueprint(anchorTourId);
  const toMap = (stops: readonly BlueprintStop[]): Map<string, BlueprintStop> =>
    new Map(stops.map((stop) => [stop.id, stop]));
  return {
    core: toMap(blueprint?.core ?? []),
    choice: toMap(blueprint?.choice?.options ?? []),
    optional: toMap(blueprint?.optional ?? []),
    choicePick: blueprint?.choice
      ? { min: blueprint.choice.pickMin, max: blueprint.choice.pickMax }
      : null,
    hasBlueprint: Boolean(blueprint),
  };
}

/**
 * Signature catalog add-on proof. Uses the EXISTING client catalog authority
 * only (`ADD_ON_CATALOG` + `isAddOnStructurallyEligible`); the server mirror
 * in `supabase/functions/_shared/pricing.ts` stays sovereign at checkout and
 * its parity is proven by the existing server-authority suite. No third
 * whitelist is created here, and no euros are read.
 */
function signatureAddOnAction(
  anchorTourId: string,
  commercialId: string | null,
): { actionId: string; rule: string } | null {
  if (!commercialId) return null;
  const tour = signatureTours.find((candidate) => candidate.id === anchorTourId) ?? null;
  if (!tour) return null;
  const catalogue = ADD_ON_CATALOG[regionBucket(tour.region)] ?? [];
  const addOn = catalogue.find((candidate) => candidate.id === commercialId) ?? null;
  if (!addOn) return null;
  if (!isAddOnStructurallyEligible(addOn, tour)) return null;
  return { actionId: `addon:${addOn.id}`, rule: `signature-addon:${addOn.id}` };
}

function isVerified(record: CompositionIdentityRecord): boolean {
  return (
    record.confidence === "verified" &&
    (record.blueprintStopId !== null || record.inventoryStopId !== null)
  );
}

function deriveClassification(entry: {
  structuralRole: StructuralRole;
  structuralValid: boolean;
  priceAction: PriceAction;
}): CommercialClassification {
  if (!entry.structuralValid || entry.priceAction === "unresolved") {
    return "commercial-unresolved";
  }
  if (entry.priceAction === "requires-confirmation") return "requires-confirmation";
  if (entry.priceAction === "signature-addon" || entry.priceAction === "extra-winery") {
    return "paid-enhancement";
  }
  if (
    entry.priceAction === "principal-removal" ||
    entry.priceAction === "dedicated-lunch-removal"
  ) {
    return "removal-credit-eligible";
  }
  return entry.structuralRole === "choice" ? "neutral-replacement" : "anchor-included";
}

type AxisResult = {
  structuralRole: StructuralRole;
  structuralValid: boolean;
  structuralNote: string | null;
  priceAction: PriceAction;
  actionId: string | null;
  rule: string | null;
};

const UNRESOLVED_AXIS = (note: string): AxisResult => ({
  structuralRole: "unresolved",
  structuralValid: false,
  structuralNote: note,
  priceAction: "unresolved",
  actionId: null,
  rule: null,
});

function keptAxes(
  anchorTourId: string,
  record: CompositionIdentityRecord,
  index: BlueprintIndex,
): AxisResult {
  if (!index.hasBlueprint) return UNRESOLVED_AXIS("no-structural-blueprint-for-anchor");
  if (!isVerified(record)) return UNRESOLVED_AXIS(`identity-${record.confidence}`);

  const bpId = record.blueprintStopId;
  if (bpId && index.core.has(bpId)) {
    return {
      structuralRole: "core",
      structuralValid: true,
      structuralNote: null,
      priceAction: "none",
      actionId: null,
      rule: `blueprint:core:${bpId}`,
    };
  }
  if (bpId && index.choice.has(bpId)) {
    return {
      structuralRole: "choice",
      structuralValid: true,
      structuralNote: null,
      priceAction: "none",
      actionId: null,
      rule: `blueprint:choice:${bpId}`,
    };
  }

  const addOn = signatureAddOnAction(anchorTourId, record.commercialId);

  if (bpId && index.optional.has(bpId)) {
    // Blueprint optionality proves membership, NEVER free inclusion.
    return addOn
      ? {
          structuralRole: "optional",
          structuralValid: true,
          structuralNote: null,
          priceAction: "signature-addon",
          actionId: addOn.actionId,
          rule: addOn.rule,
        }
      : {
          structuralRole: "optional",
          structuralValid: true,
          structuralNote: "optional-inclusion-not-proven",
          priceAction: "requires-confirmation",
          actionId: null,
          rule: `blueprint:optional:${bpId}`,
        };
  }

  // A non-null blueprint id that belongs to no anchor map is NOT a sibling.
  // A commercialId may never rescue an invalid structural identity.
  if (bpId) return UNRESOLVED_AXIS(`blueprint-stop-not-in-anchor:${bpId}`);
  if (!record.inventoryStopId) return UNRESOLVED_AXIS("no-structural-identity");

  // Verified inventory moment outside the anchor blueprint.

  return addOn
    ? {
        structuralRole: "sibling",
        structuralValid: true,
        structuralNote: null,
        priceAction: "signature-addon",
        actionId: addOn.actionId,
        rule: addOn.rule,
      }
    : {
        structuralRole: "sibling",
        structuralValid: true,
        structuralNote: "outside-blueprint-no-approved-action",
        priceAction: "requires-confirmation",
        actionId: null,
        rule: null,
      };
}

function omittedAxes(
  anchorTourId: string,
  record: CompositionIdentityRecord,
  index: BlueprintIndex,
): AxisResult {
  if (!index.hasBlueprint) return UNRESOLVED_AXIS("no-structural-blueprint-for-anchor");
  if (!isVerified(record)) return UNRESOLVED_AXIS(`identity-${record.confidence}`);

  const bpId = record.blueprintStopId;

  if (bpId && index.optional.has(bpId)) {
    // Not selecting an optional extension is simply price-neutral.
    return {
      structuralRole: "optional",
      structuralValid: true,
      structuralNote: null,
      priceAction: "none",
      actionId: null,
      rule: `blueprint:optional-not-selected:${bpId}`,
    };
  }

  if (bpId && index.choice.has(bpId)) {
    // Cardinality of the KEPT picks is what matters; an omission never
    // earns a credit on its own.
    return {
      structuralRole: "choice",
      structuralValid: true,
      structuralNote: null,
      priceAction: "none",
      actionId: null,
      rule: `blueprint:choice-not-picked:${bpId}`,
    };
  }

  if (bpId && index.core.has(bpId)) {
    const core = index.core.get(bpId)!;
    // A mandatory transfer (e.g. the Sado ferry) is INTERNAL TRANSIT, never a
    // customer-selectable moment: it is always operated and always included in
    // the anchor price. Its absence from the visible itinerary list is not an
    // omission and must never require confirmation.
    if (core.lock?.reasonCode === "mandatory_transfer") {
      return {
        structuralRole: "core",
        structuralValid: true,
        structuralNote: null,
        priceAction: "none",
        actionId: null,
        rule: `blueprint:mandatory-transfer:${bpId}`,
      };
    }
    const pricingClass = classifyTailorCoreStop(anchorTourId, bpId, {
      dedicatedCreditStopId: dedicatedLunchStopId(anchorTourId),
    });
    if (pricingClass === "locked") {
      return {
        structuralRole: "core",
        structuralValid: false,
        structuralNote: `core-locked:${core.lock?.reasonCode ?? "locked"}`,
        priceAction: "requires-confirmation",
        actionId: null,
        rule: `blueprint:core-lock:${bpId}`,
      };
    }
    if (pricingClass === "dedicated-credit") {
      return {
        structuralRole: "core",
        structuralValid: true,
        structuralNote: null,
        priceAction: "dedicated-lunch-removal",
        actionId: "tailor:remove-included-lunch",
        rule: `tailor:dedicated-lunch-credit:${bpId}`,
      };
    }
    if (pricingClass === "principal") {
      return {
        structuralRole: "core",
        structuralValid: true,
        structuralNote: null,
        priceAction: "principal-removal",
        actionId: "tailor:principal-removal",
        rule: `tailor:principal-removal:${bpId}`,
      };
    }
    if (pricingClass === "descriptive") {
      return {
        structuralRole: "core",
        structuralValid: true,
        structuralNote: null,
        priceAction: "none",
        actionId: null,
        rule: `tailor:descriptive-core:${bpId}`,
      };
    }
    // `needs-owner-review` or unknown — fail closed.
    return {
      structuralRole: "core",
      structuralValid: true,
      structuralNote: "core-pricing-class-pending-owner-review",
      priceAction: "requires-confirmation",
      actionId: null,
      rule: `tailor:core-needs-owner-review:${bpId}`,
    };
  }

  // A non-null blueprint id absent from every anchor map is invalid identity.
  if (bpId) return UNRESOLVED_AXIS(`blueprint-stop-not-in-anchor:${bpId}`);
  if (!record.inventoryStopId) return UNRESOLVED_AXIS("no-structural-identity");

  // A pool moment that was never part of the anchor day: neutral.
  return {
    structuralRole: "sibling",
    structuralValid: true,
    structuralNote: null,
    priceAction: "none",
    actionId: null,
    rule: null,
  };
}

function keptWineryCount(
  kept: ReadonlyArray<CompositionIdentityRecord>,
  index: BlueprintIndex,
): number {
  return kept.filter((record) => {
    const bpId = record.blueprintStopId;
    if (!bpId) return false;
    const stop = index.core.get(bpId) ?? index.choice.get(bpId);
    return stop?.category === "winery";
  }).length;
}

export function buildCommercialLedger(input: {
  anchorTourId: string;
  kept: ReadonlyArray<CompositionIdentityRecord>;
  omitted?: ReadonlyArray<CompositionIdentityRecord>;
}): CommercialLedger {
  const index = blueprintIndex(input.anchorTourId);
  const omittedRecords = input.omitted ?? [];
  const notes: string[] = [];
  if (!index.hasBlueprint) notes.push("no-structural-blueprint-for-anchor");

  const entries: CommercialLedgerEntry[] = [];
  const push = (
    record: CompositionIdentityRecord,
    kind: "kept" | "omitted",
    axes: AxisResult,
  ): void => {
    entries.push({
      label: record.label,
      inventoryStopId: record.inventoryStopId,
      blueprintStopId: record.blueprintStopId,
      commercialId: record.commercialId,
      kind,
      structuralRole: axes.structuralRole,
      structuralValid: axes.structuralValid,
      structuralNote: axes.structuralNote,
      priceAction: axes.priceAction,
      actionId: axes.actionId,
      rule: axes.rule,
      classification: deriveClassification(axes),
    });
  };

  for (const record of input.kept) {
    push(record, "kept", keptAxes(input.anchorTourId, record, index));
  }
  for (const record of omittedRecords) {
    push(record, "omitted", omittedAxes(input.anchorTourId, record, index));
  }

  /* ---- choice cardinality (global structural rule) ---- */
  const keptChoiceCount = input.kept.filter(
    (record) => record.blueprintStopId && index.choice.has(record.blueprintStopId),
  ).length;
  let cardinalityValid = true;
  // Validate ALWAYS when the anchor declares a choice group — including zero
  // kept picks, which would otherwise silently satisfy a pickMin requirement.
  if (index.choicePick) {
    if (keptChoiceCount < index.choicePick.min || keptChoiceCount > index.choicePick.max) {
      cardinalityValid = false;
      notes.push(
        `choice-cardinality-out-of-range:${keptChoiceCount}:${index.choicePick.min}-${index.choicePick.max}`,
      );
      for (const entry of entries) {
        if (entry.kind !== "kept" || entry.structuralRole !== "choice") continue;
        entry.structuralValid = false;
        entry.structuralNote = "choice-cardinality-out-of-range";
        entry.priceAction = "unresolved";
        entry.actionId = null;
        entry.classification = "commercial-unresolved";
      }
    }
  }

  /* ---- Arrábida winery ladder (aggregate, quantity only, no euros) ---- */
  const actions: CommercialLedgerAction[] = [];
  let ladderUnresolved = false;
  const wineryRule = index.hasBlueprint ? tailorRules(input.anchorTourId).wineries : undefined;
  if (wineryRule) {
    const wineries = keptWineryCount(input.kept, index);
    // RAW skipped-core count — exactly the Tailor caller semantics.
    const stopsRemovedCoreCount = omittedRecords.filter(
      (record) => record.blueprintStopId && index.core.has(record.blueprintStopId),
    ).length;

    if (wineries > wineryRule.max) {
      ladderUnresolved = true;
      notes.push(`winery-count-above-max:${wineries}:${wineryRule.max}`);
    } else if (wineries > wineryRule.included) {
      const gate = canSelectWineries(input.anchorTourId, wineries, stopsRemovedCoreCount);
      if (!gate.allowed) {
        ladderUnresolved = true;
        notes.push(`winery-gate-blocked:${gate.code}:${wineries}:removed-${stopsRemovedCoreCount}`);
      } else {
        actions.push({
          actionId: "tailor:extra-winery",
          priceAction: "extra-winery",
          quantity: wineries - wineryRule.included,
        });
      }
    }
  }

  /* ---- aggregate per-entry actions ---- */
  const aggregate = new Map<string, CommercialLedgerAction>();
  for (const entry of entries) {
    if (!entry.actionId || !KNOWN_PRICE_ACTIONS.has(entry.priceAction)) continue;
    const existing = aggregate.get(entry.actionId);
    if (existing) existing.quantity += 1;
    else
      aggregate.set(entry.actionId, {
        actionId: entry.actionId,
        priceAction: entry.priceAction,
        quantity: 1,
      });
  }
  actions.push(...aggregate.values());
  actions.sort((a, b) => a.actionId.localeCompare(b.actionId));

  /* ---- disposition ---- */
  const anyInvalid =
    !index.hasBlueprint ||
    !cardinalityValid ||
    ladderUnresolved ||
    entries.some(
      (entry) =>
        !entry.structuralValid ||
        entry.priceAction === "unresolved" ||
        entry.priceAction === "requires-confirmation",
    );

  const disposition: CommercialDisposition = anyInvalid
    ? "commercial-unresolved"
    : actions.length > 0
      ? "known-price-action-required"
      : "anchor-price-safe";

  return { anchorTourId: input.anchorTourId, entries, actions, disposition, notes };
}

/* ------------------------------------------------------------------ *
 * FINAL CERTIFICATION — checkout parity / add-on deduplication
 * ------------------------------------------------------------------ */

export type LedgerCheckoutParity = {
  /** Deduped actions: one `addon:<id>` action per catalogue identity. */
  actions: CommercialLedgerAction[];
  /** Add-on ids present BOTH as a route moment and in the checkout basket. */
  duplicateAddOnIds: string[];
  /** Checkout add-ons the ledger cannot attribute to any approved action. */
  unattributedAddOnIds: string[];
  notes: string[];
};

const ADDON_ACTION_PREFIX = "addon:";

/**
 * Reconcile the structural ledger with the add-ons the traveller actually
 * selected at checkout.
 *
 * An add-on that is already IN the composed route (a `signature-addon`
 * price action) and is ALSO ticked in the checkout basket must be charged
 * exactly once — never twice. This function collapses that duplication and
 * reports it, and it flags any basket add-on the ledger cannot attribute.
 *
 * It returns quantities only. No euros are read, computed or returned; the
 * server pricing authority remains sovereign.
 */
export function reconcileLedgerWithCheckoutAddOns(
  ledger: CommercialLedger,
  selectedAddOnIds: ReadonlyArray<string>,
): LedgerCheckoutParity {
  const selected = Array.from(new Set(selectedAddOnIds.filter(Boolean)));
  const notes: string[] = [];

  // 1. Collapse repeated `addon:<id>` actions to quantity 1 — a catalogue
  //    add-on is a day-level enhancement, not a per-moment multiplier.
  const actions = ledger.actions.map((action) =>
    action.actionId.startsWith(ADDON_ACTION_PREFIX) && action.quantity > 1
      ? { ...action, quantity: 1 }
      : { ...action },
  );
  for (const action of ledger.actions) {
    if (action.actionId.startsWith(ADDON_ACTION_PREFIX) && action.quantity > 1) {
      notes.push(`addon-quantity-collapsed:${action.actionId}:${action.quantity}`);
    }
  }

  const routeAddOnIds = new Set(
    actions
      .filter((action) => action.actionId.startsWith(ADDON_ACTION_PREFIX))
      .map((action) => action.actionId.slice(ADDON_ACTION_PREFIX.length)),
  );

  // 2. Duplication: the same add-on in the route AND in the basket.
  const duplicateAddOnIds = selected.filter((id) => routeAddOnIds.has(id)).sort();
  for (const id of duplicateAddOnIds) notes.push(`addon-duplicate-suppressed:${id}`);

  // 3. Basket add-ons with no ledger action are charged by the existing
  //    add-on authority, but they are reported so parity stays auditable.
  const unattributedAddOnIds = selected.filter((id) => !routeAddOnIds.has(id)).sort();

  actions.sort((a, b) => a.actionId.localeCompare(b.actionId));

  return { actions, duplicateAddOnIds, unattributedAddOnIds, notes };
}
