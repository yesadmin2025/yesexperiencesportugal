/**
 * Composable moments — the owner-priced catalogue that lets a bespoke Studio
 * day hold a verified regional moment from OUTSIDE the anchor Signature.
 *
 * Fail-closed is the contract: no active priced row, no composable moment.
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  clearComposableStopAuthority,
  composableQuantity,
  composableStopLine,
  isComposableStop,
  setComposableStopAuthority,
  type ComposableStopRow,
} from "@/lib/studio-v3/composableStopAuthority";
import { buildCommercialLedger } from "@/lib/studio-v3/commercialLedger";
import type { CompositionIdentityRecord } from "@/lib/studio-v3/compositionIdentity";
import { REGION_STOP_POOL } from "@/data/regionStopPool";

const row = (over: Partial<ComposableStopRow> & { stopId: string }): ComposableStopRow => ({
  region: "arrabida",
  priceCents: 4500,
  pricingUnit: "per_person",
  minGuests: 1,
  active: true,
  notes: null,
  ...over,
});

afterEach(() => clearComposableStopAuthority());

describe("composableStopAuthority", () => {
  it("only admits active, priced rows", () => {
    setComposableStopAuthority([
      row({ stopId: "a" }),
      row({ stopId: "b", active: false }),
      row({ stopId: "c", priceCents: 0 }),
    ]);
    expect(isComposableStop("a")).toBe(true);
    expect(isComposableStop("b")).toBe(false);
    expect(isComposableStop("c")).toBe(false);
    expect(isComposableStop("unknown")).toBe(false);
  });

  it("derives quantity from the pricing unit", () => {
    expect(composableQuantity("per_person", 4)).toBe(4);
    expect(composableQuantity("per_group", 4)).toBe(1);
    expect(composableQuantity("fixed", 4)).toBe(1);
    expect(composableQuantity("per_vehicle", 9)).toBe(2);
  });

  it("prices a line and refuses below the minimum party", () => {
    setComposableStopAuthority([row({ stopId: "a", priceCents: 4500, minGuests: 2 })]);
    expect(composableStopLine("a", 3)).toMatchObject({ quantity: 3, totalEurCents: 13500 });
    expect(composableStopLine("a", 1)).toBeNull();
  });

  it("is empty (fail closed) with no catalogue loaded", () => {
    expect(isComposableStop("a")).toBe(false);
    expect(composableStopLine("a", 2)).toBeNull();
  });
});

describe("commercial ledger — composable moments", () => {
  const anchorTourId = "arrabida-wine";
  const sibling =
    REGION_STOP_POOL.find(
      (stop) => stop.active && stop.signatureTourId && stop.signatureTourId !== anchorTourId,
    ) ?? null;

  const record = (stopId: string): CompositionIdentityRecord => ({
    slot: 0,
    label: "Composed moment",
    inventoryStopId: stopId,
    blueprintStopId: null,
    commercialId: null,
    confidence: "verified",
    source: "composer-inventory-id",
    candidateInventoryStopIds: [],
    candidateBlueprintStopIds: [],
  });

  it("turns an owner-priced outside moment into a KNOWN paid action", () => {
    if (!sibling) return;
    setComposableStopAuthority([row({ stopId: sibling.id, region: sibling.region })]);
    const ledger = buildCommercialLedger({ anchorTourId, kept: [record(sibling.id)] });
    const entry = ledger.entries.find((e) => e.inventoryStopId === sibling.id);
    expect(entry?.priceAction).toBe("composable-stop");
    expect(entry?.actionId).toBe(`composable:${sibling.id}`);
    expect(entry?.classification).toBe("paid-enhancement");
  });

  it("still fails closed for the same moment with no price row", () => {
    if (!sibling) return;
    const ledger = buildCommercialLedger({ anchorTourId, kept: [record(sibling.id)] });
    const entry = ledger.entries.find((e) => e.inventoryStopId === sibling.id);
    expect(entry?.priceAction).not.toBe("composable-stop");
  });
});
