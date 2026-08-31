/**
 * LIVE COMMERCIAL STATE FOR CHECKOUT — one reconciliation point between
 *
 *   the authored route (what the traveller approved)
 *   + the structural commercial ledger (what that route triggers)
 *   + the selected catalogue add-ons (the basket)
 *
 * Responsibilities, and nothing else:
 *
 *  1. A catalogue add-on that is BOTH a route moment (a `signature-addon`
 *     ledger action) and ticked in the basket is charged exactly ONCE.
 *  2. The state is keyed to the exact authored composition, so a stale
 *     ledger can never survive a route edit — the key changes with the route.
 *  3. FAIL CLOSED: if the composed day is the one being sold and its
 *     commercial disposition is not proven safe, or any action carries a
 *     price action no approved authority can price, checkout is blocked.
 *
 * No euros are read, derived or returned here. The server pricing authority
 * (tiers + Stripe) stays sovereign; this module only decides *what* may be
 * charged, never *how much*.
 *
 * Pure, synchronous, deterministic. No React, no fetch.
 */

import {
  isKnownPriceAction,
  reconcileLedgerWithCheckoutAddOns,
  type CommercialLedger,
  type CommercialLedgerAction,
  type LedgerCheckoutParity,
} from "./commercialLedger";

export type CheckoutBlockReason =
  | "commercial-unresolved"
  | "unknown-price-action"
  | "composition-empty";

export interface CheckoutCommercialInput {
  /** Structural ledger for the CURRENT authored composition. May be absent. */
  ledger?: CommercialLedger | null;
  /** Whether the composed day (vs the authored anchor) is what is being sold. */
  liveResolution?: "composed" | "authored-fallback" | null;
  /** Catalogue add-ons ticked in the basket right now. */
  selectedAddOnIds?: ReadonlyArray<string>;
  /** Labels of the authored route the traveller approved, in order. */
  authoredLabels?: ReadonlyArray<string>;
  /**
   * Structural identity of each authored moment, in order (`bp:` / `inv:` /
   * the documented `label:` legacy boundary). When present these — not the
   * display labels — key the composition, so two different moments that
   * happen to share a label can never collapse into one key.
   */
  authoredIdentityKeys?: ReadonlyArray<string>;
}

export interface CheckoutCommercialState {
  /** Changes whenever the authored route or the basket changes. */
  readonly compositionKey: string;
  readonly parity: LedgerCheckoutParity | null;
  /** Add-ons that may be charged as basket lines (duplicates removed). */
  readonly chargeableAddOnIds: string[];
  /** Add-ons already carried by the route — never charged a second time. */
  readonly suppressedAddOnIds: string[];
  /** Deduped quantity-only actions. Never euros. */
  readonly actions: CommercialLedgerAction[];
  readonly blocked: boolean;
  readonly blockReason: CheckoutBlockReason | null;
  readonly notes: string[];
}

export function resolveCheckoutCommercialState(
  input: CheckoutCommercialInput,
): CheckoutCommercialState {
  const authoredLabels = (input.authoredLabels ?? []).map((l) => l.trim()).filter(Boolean);
  const selected = Array.from(new Set((input.selectedAddOnIds ?? []).filter(Boolean)));
  const ledger = input.ledger ?? null;

  const identityKeys = (input.authoredIdentityKeys ?? []).filter(Boolean);
  const compositionKey = JSON.stringify({
    route: identityKeys.length > 0 ? identityKeys : authoredLabels,
    addOns: [...selected].sort(),
    anchor: ledger?.anchorTourId ?? null,
  });

  if (!ledger) {
    // No structural ledger (legacy / anchor Signature day): the existing
    // anchor pricing authority owns the day. Basket add-ons are charged
    // normally; nothing to deduplicate, nothing to block.
    return {
      compositionKey,
      parity: null,
      chargeableAddOnIds: [...selected].sort(),
      suppressedAddOnIds: [],
      actions: [],
      blocked: authoredLabels.length === 0,
      blockReason: authoredLabels.length === 0 ? "composition-empty" : null,
      notes: [],
    };
  }

  const parity = reconcileLedgerWithCheckoutAddOns(ledger, selected);
  const notes = [...ledger.notes, ...parity.notes];

  const unknownAction = parity.actions.find((a) => !isKnownPriceAction(a.priceAction));

  let blocked = false;
  let blockReason: CheckoutBlockReason | null = null;

  if (authoredLabels.length === 0) {
    blocked = true;
    blockReason = "composition-empty";
  } else if (unknownAction) {
    blocked = true;
    blockReason = "unknown-price-action";
    notes.push(`unknown-price-action:${unknownAction.actionId}:${unknownAction.priceAction}`);
  } else if (
    input.liveResolution === "composed" &&
    ledger.disposition === "commercial-unresolved"
  ) {
    blocked = true;
    blockReason = "commercial-unresolved";
  }

  return {
    compositionKey,
    parity,
    chargeableAddOnIds: parity.unattributedAddOnIds,
    suppressedAddOnIds: parity.duplicateAddOnIds,
    actions: parity.actions,
    blocked,
    blockReason,
    notes,
  };
}
