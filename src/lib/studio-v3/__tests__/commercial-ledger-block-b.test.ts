/**
 * BUILD 1 / Pass 4 · BLOCK B — commercial ledger certification.
 *
 * Every case uses honest structural fixtures (real blueprint stop ids, real
 * catalog add-on ids). No `if (...) return` gates, no casts used to force
 * green. The ledger must stay a fail-closed CLASSIFIER: no euros anywhere.
 */

import { describe, expect, it } from "vitest";

import { buildCommercialLedger } from "@/lib/studio-v3/commercialLedger";
import type { CompositionIdentityRecord } from "@/lib/studio-v3/compositionIdentity";
import { ADD_ON_CATALOG, isAddOnStructurallyEligible, regionBucket } from "@/data/signatureAddOns";
import { signatureTours } from "@/data/signatureTours";

const ARRABIDA = "arrabida-wine-allinclusive";
const SINTRA = "sintra-cascais";
const TROIA = "troia-comporta";
const VICENTINE = "southwest-vicentine-coast";

let slot = 0;

function blueprintRecord(
  blueprintStopId: string,
  extra: Partial<CompositionIdentityRecord> = {},
): CompositionIdentityRecord {
  return {
    slot: slot++,
    label: blueprintStopId,
    inventoryStopId: null,
    blueprintStopId,
    commercialId: null,
    confidence: "verified",
    source: "blueprint-id",
    candidateInventoryStopIds: [],
    candidateBlueprintStopIds: [],
    ...extra,
  };
}

function siblingRecord(
  inventoryStopId: string,
  commercialId: string | null,
): CompositionIdentityRecord {
  return {
    slot: slot++,
    label: inventoryStopId,
    inventoryStopId,
    blueprintStopId: null,
    commercialId,
    confidence: "verified",
    source: "composer-inventory-id",
    candidateInventoryStopIds: [],
    candidateBlueprintStopIds: [],
  };
}

const arrabidaCore = (): CompositionIdentityRecord[] => [
  blueprintRecord("livramento"),
  blueprintRecord("arrabida-park"),
  blueprintRecord("azeitao-tiles"),
  blueprintRecord("lunch-azeitao"),
];

function entryFor(
  ledger: ReturnType<typeof buildCommercialLedger>,
  blueprintStopId: string,
  kind: "kept" | "omitted",
) {
  const found = ledger.entries.find(
    (entry) => entry.blueprintStopId === blueprintStopId && entry.kind === kind,
  );
  expect(found, `${kind} entry for ${blueprintStopId}`).toBeDefined();
  return found!;
}

describe("Block B — structural axis", () => {
  it("1 · verified core kept with no commercial id is anchor-included and safe", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [...arrabidaCore(), blueprintRecord("jmf"), blueprintRecord("bacalhoa")],
      omitted: [],
    });
    const core = entryFor(ledger, "livramento", "kept");
    expect(core.structuralRole).toBe("core");
    expect(core.structuralValid).toBe(true);
    expect(core.priceAction).toBe("none");
    expect(core.commercialId).toBeNull();
    expect(ledger.disposition).toBe("anchor-price-safe");
  });

  it("2 · Sintra 1-of-1 choice is valid, price-neutral and safe", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: SINTRA,
      kept: [
        blueprintRecord("sintra-vila"),
        blueprintRecord("lunch-azenhas"),
        blueprintRecord("cabo-da-roca"),
        blueprintRecord("cascais"),
        blueprintRecord("pena"),
      ],
      omitted: [blueprintRecord("regaleira"), blueprintRecord("sintra-palace")],
    });
    const pena = entryFor(ledger, "pena", "kept");
    expect(pena.structuralRole).toBe("choice");
    expect(pena.structuralValid).toBe(true);
    expect(pena.priceAction).toBe("none");
    expect(ledger.actions).toEqual([]);
    expect(ledger.disposition).toBe("anchor-price-safe");
  });

  it("16 · an anchor with no blueprint fails closed", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: VICENTINE,
      kept: [siblingRecord("vicentine-cliff", null)],
      omitted: [],
    });
    expect(ledger.notes).toContain("no-structural-blueprint-for-anchor");
    expect(ledger.entries[0].structuralRole).toBe("unresolved");
    expect(ledger.entries[0].priceAction).toBe("unresolved");
    expect(ledger.disposition).toBe("commercial-unresolved");
  });

  it("15 · a verified sibling with no approved action requires confirmation", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [...arrabidaCore(), blueprintRecord("jmf"), blueprintRecord("bacalhoa"), siblingRecord("cristo-rei-view", null)],
      omitted: [],
    });
    const sibling = ledger.entries.find((entry) => entry.inventoryStopId === "cristo-rei-view")!;
    expect(sibling.structuralRole).toBe("sibling");
    expect(sibling.priceAction).toBe("requires-confirmation");
    expect(ledger.disposition).toBe("commercial-unresolved");
  });

  it("12 · a kept optional blueprint stop is never assumed free", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [
        ...arrabidaCore(),
        blueprintRecord("jmf"),
        blueprintRecord("bacalhoa"),
        blueprintRecord("cristo-rei"),
      ],
      omitted: [],
    });
    const optional = entryFor(ledger, "cristo-rei", "kept");
    expect(optional.structuralRole).toBe("optional");
    expect(optional.structuralValid).toBe(true);
    expect(optional.priceAction).toBe("requires-confirmation");
    expect(ledger.disposition).toBe("commercial-unresolved");
  });

  it("11 · an omitted optional stop is price-neutral and keeps the day safe", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [...arrabidaCore(), blueprintRecord("jmf"), blueprintRecord("bacalhoa")],
      omitted: [blueprintRecord("cristo-rei"), blueprintRecord("sesimbra-castle")],
    });
    expect(entryFor(ledger, "cristo-rei", "omitted").priceAction).toBe("none");
    expect(ledger.actions).toEqual([]);
    expect(ledger.disposition).toBe("anchor-price-safe");
  });
});

describe("Block B — winery ladder", () => {
  const withWineries = (ids: string[], omitted: CompositionIdentityRecord[] = []) =>
    buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [...arrabidaCore(), ...ids.map((id) => blueprintRecord(id))],
      omitted,
    });

  it("3 · exactly two wineries is anchor-price-safe", () => {
    const ledger = withWineries(["jmf", "bacalhoa"]);
    expect(ledger.actions).toEqual([]);
    expect(ledger.disposition).toBe("anchor-price-safe");
  });

  it("4 · three wineries emit one extra-winery unit", () => {
    const ledger = withWineries(["jmf", "bacalhoa", "catralvos"]);
    expect(ledger.actions).toEqual([
      { actionId: "tailor:extra-winery", priceAction: "extra-winery", quantity: 1 },
    ]);
    expect(ledger.disposition).toBe("known-price-action-required");
  });

  it("5 · four wineries with zero omitted core stops fails the removal gate", () => {
    const ledger = withWineries(["jmf", "bacalhoa", "catralvos", "piloto"]);
    expect(ledger.actions).toEqual([]);
    expect(ledger.notes.some((note) => note.startsWith("winery-gate-blocked:needs-removal"))).toBe(
      true,
    );
    expect(ledger.disposition).toBe("commercial-unresolved");
  });

  it("6 · four wineries with one omitted principal core stop is allowed", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [
        blueprintRecord("arrabida-park"),
        blueprintRecord("azeitao-tiles"),
        blueprintRecord("lunch-azeitao"),
        blueprintRecord("jmf"),
        blueprintRecord("bacalhoa"),
        blueprintRecord("catralvos"),
        blueprintRecord("piloto"),
      ],
      omitted: [blueprintRecord("livramento")],
    });
    expect(ledger.actions).toEqual([
      { actionId: "tailor:extra-winery", priceAction: "extra-winery", quantity: 2 },
      { actionId: "tailor:principal-removal", priceAction: "principal-removal", quantity: 1 },
    ]);
    expect(entryFor(ledger, "livramento", "omitted").priceAction).toBe("principal-removal");
    expect(ledger.disposition).toBe("known-price-action-required");
  });

  it("7 · five wineries break blueprint cardinality and stay unresolved", () => {
    const ledger = withWineries(["jmf", "bacalhoa", "catralvos", "piloto", "palmela"], [
      blueprintRecord("livramento"),
    ]);
    expect(ledger.notes.some((note) => note.startsWith("choice-cardinality-out-of-range"))).toBe(
      true,
    );
    expect(ledger.notes.some((note) => note.startsWith("winery-count-above-max"))).toBe(true);
    expect(ledger.disposition).toBe("commercial-unresolved");
  });
});

describe("Block B — omitted core semantics", () => {
  it("8 · a locked core omission never earns a credit", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: TROIA,
      kept: [blueprintRecord("troia-ruins")],
      omitted: [blueprintRecord("sado-ferry")],
    });
    const ferry = entryFor(ledger, "sado-ferry", "omitted");
    expect(ferry.structuralValid).toBe(false);
    expect(ferry.priceAction).toBe("requires-confirmation");
    expect(ferry.actionId).toBeNull();
    expect(ledger.disposition).toBe("commercial-unresolved");
  });

  it("9 · removing the included lunch is only a dedicated-lunch-removal", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [
        blueprintRecord("livramento"),
        blueprintRecord("arrabida-park"),
        blueprintRecord("azeitao-tiles"),
        blueprintRecord("jmf"),
        blueprintRecord("bacalhoa"),
      ],
      omitted: [blueprintRecord("lunch-azeitao")],
    });
    const lunch = entryFor(ledger, "lunch-azeitao", "omitted");
    expect(lunch.priceAction).toBe("dedicated-lunch-removal");
    expect(lunch.actionId).toBe("tailor:remove-included-lunch");
    expect(ledger.actions.map((a) => a.actionId)).toEqual(["tailor:remove-included-lunch"]);
    expect(ledger.actions.some((a) => a.priceAction === "principal-removal")).toBe(false);
    expect(ledger.disposition).toBe("known-price-action-required");
  });

  it("10 · a descriptive core omission is price-neutral", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [
        blueprintRecord("livramento"),
        blueprintRecord("azeitao-tiles"),
        blueprintRecord("lunch-azeitao"),
        blueprintRecord("jmf"),
        blueprintRecord("bacalhoa"),
      ],
      omitted: [blueprintRecord("arrabida-park")],
    });
    expect(entryFor(ledger, "arrabida-park", "omitted").priceAction).toBe("none");
    expect(ledger.actions).toEqual([]);
    expect(ledger.disposition).toBe("anchor-price-safe");
  });
});

describe("Block B — Signature catalog add-ons", () => {
  it("13 · a real eligible catalog pair becomes a signature-addon action", () => {
    const anchor = signatureTours.find((tour) => tour.id === ARRABIDA)!;
    const addOn = (ADD_ON_CATALOG[regionBucket(anchor.region)] ?? []).find(
      (candidate) => candidate.id === "azulejo-workshop",
    )!;
    expect(isAddOnStructurallyEligible(addOn, anchor)).toBe(true);

    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [
        ...arrabidaCore(),
        blueprintRecord("jmf"),
        blueprintRecord("bacalhoa"),
        siblingRecord("azulejos-painting-workshop", "azulejo-workshop"),
      ],
      omitted: [],
    });
    const entry = ledger.entries.find((e) => e.commercialId === "azulejo-workshop")!;
    expect(entry.structuralRole).toBe("sibling");
    expect(entry.priceAction).toBe("signature-addon");
    expect(entry.actionId).toBe("addon:azulejo-workshop");
    expect(ledger.actions).toEqual([
      { actionId: "addon:azulejo-workshop", priceAction: "signature-addon", quantity: 1 },
    ]);
    expect(ledger.disposition).toBe("known-price-action-required");
  });

  it("14 · a wrong-anchor add-on and a bogus id never become signature-addon", () => {
    const sintra = signatureTours.find((tour) => tour.id === SINTRA)!;
    const addOn = (ADD_ON_CATALOG[regionBucket(sintra.region)] ?? []).find(
      (candidate) => candidate.id === "azulejo-workshop",
    )!;
    expect(isAddOnStructurallyEligible(addOn, sintra)).toBe(false);

    const wrongAnchor = buildCommercialLedger({
      anchorTourId: SINTRA,
      kept: [
        blueprintRecord("sintra-vila"),
        blueprintRecord("pena"),
        siblingRecord("azulejos-painting-workshop", "azulejo-workshop"),
      ],
      omitted: [],
    });
    const wrongEntry = wrongAnchor.entries.find((e) => e.commercialId === "azulejo-workshop")!;
    expect(wrongEntry.priceAction).toBe("requires-confirmation");
    expect(wrongEntry.actionId).toBeNull();
    expect(wrongAnchor.disposition).toBe("commercial-unresolved");

    const bogus = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [...arrabidaCore(), blueprintRecord("jmf"), blueprintRecord("bacalhoa"), siblingRecord("x-stop", "not-an-add-on")],
      omitted: [],
    });
    const bogusEntry = bogus.entries.find((e) => e.commercialId === "not-an-add-on")!;
    expect(bogusEntry.priceAction).toBe("requires-confirmation");
    expect(bogus.disposition).toBe("commercial-unresolved");
  });

  it("E · an outside-blueprint moment can never become an add-lunch action", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [...arrabidaCore(), blueprintRecord("jmf"), blueprintRecord("bacalhoa"), siblingRecord("some-table-moment", null)],
      omitted: [],
    });
    const entry = ledger.entries.find((e) => e.inventoryStopId === "some-table-moment")!;
    expect(entry.priceAction).toBe("requires-confirmation");
    expect(ledger.actions.some((a) => a.actionId.includes("lunch"))).toBe(false);
  });
});

describe("Block B — final audit corrections", () => {
  it("A · Sintra with zero kept choices fails closed on pickMin", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: SINTRA,
      kept: [
        blueprintRecord("sintra-vila"),
        blueprintRecord("lunch-azenhas"),
        blueprintRecord("cabo-da-roca"),
        blueprintRecord("cascais"),
      ],
      omitted: [blueprintRecord("pena"), blueprintRecord("regaleira"), blueprintRecord("sintra-palace")],
    });
    expect(ledger.notes.some((note) => note.startsWith("choice-cardinality-out-of-range:0:1-"))).toBe(
      true,
    );
    expect(entryFor(ledger, "pena", "omitted").priceAction).toBe("none");
    expect(ledger.disposition).toBe("commercial-unresolved");
  });

  it("B · Arrábida with only one kept winery fails closed on pickMin 2", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [...arrabidaCore(), blueprintRecord("jmf")],
      omitted: [],
    });
    expect(ledger.notes).toContain("choice-cardinality-out-of-range:1:2-4");
    expect(entryFor(ledger, "jmf", "kept").structuralValid).toBe(false);
    expect(ledger.actions).toEqual([]);
    expect(ledger.disposition).toBe("commercial-unresolved");
  });

  it("C · a kept unknown non-null blueprint id never becomes a sibling", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [
        ...arrabidaCore(),
        blueprintRecord("jmf"),
        blueprintRecord("bacalhoa"),
        blueprintRecord("not-a-real-blueprint-stop"),
      ],
      omitted: [],
    });
    const entry = entryFor(ledger, "not-a-real-blueprint-stop", "kept");
    expect(entry.structuralRole).toBe("unresolved");
    expect(entry.structuralValid).toBe(false);
    expect(entry.structuralNote).toBe("blueprint-stop-not-in-anchor:not-a-real-blueprint-stop");
    expect(entry.priceAction).toBe("unresolved");
    expect(ledger.disposition).toBe("commercial-unresolved");
  });

  it("C2 · an unknown blueprint id is not rescued by a valid catalog commercialId", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [
        ...arrabidaCore(),
        blueprintRecord("jmf"),
        blueprintRecord("bacalhoa"),
        blueprintRecord("not-a-real-blueprint-stop", { commercialId: "azulejo-workshop" }),
      ],
      omitted: [],
    });
    const entry = entryFor(ledger, "not-a-real-blueprint-stop", "kept");
    expect(entry.structuralValid).toBe(false);
    expect(entry.priceAction).toBe("unresolved");
    expect(entry.actionId).toBeNull();
    expect(ledger.actions).toEqual([]);
  });

  it("D · an omitted unknown non-null blueprint id fails closed too", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [...arrabidaCore(), blueprintRecord("jmf"), blueprintRecord("bacalhoa")],
      omitted: [blueprintRecord("not-a-real-blueprint-stop")],
    });
    const entry = entryFor(ledger, "not-a-real-blueprint-stop", "omitted");
    expect(entry.structuralRole).toBe("unresolved");
    expect(entry.structuralValid).toBe(false);
    expect(entry.priceAction).toBe("unresolved");
    expect(entry.structuralNote).toBe("blueprint-stop-not-in-anchor:not-a-real-blueprint-stop");
    expect(ledger.disposition).toBe("commercial-unresolved");
  });

  it("E · a legitimate sibling identity is still accepted as sibling", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [
        ...arrabidaCore(),
        blueprintRecord("jmf"),
        blueprintRecord("bacalhoa"),
        siblingRecord("cristo-rei-view", null),
      ],
      omitted: [siblingRecord("some-pool-moment", null)],
    });
    const kept = ledger.entries.find((e) => e.inventoryStopId === "cristo-rei-view")!;
    expect(kept.structuralRole).toBe("sibling");
    expect(kept.structuralValid).toBe(true);
    expect(kept.priceAction).toBe("requires-confirmation");
    const omitted = ledger.entries.find((e) => e.inventoryStopId === "some-pool-moment")!;
    expect(omitted.structuralRole).toBe("sibling");
    expect(omitted.priceAction).toBe("none");
  });
});

describe("Block B — ledger invariants", () => {
  it("17 · entry identity and order mirror the kept-then-omitted input exactly", () => {
    const kept = [...arrabidaCore(), blueprintRecord("jmf"), blueprintRecord("bacalhoa")];
    const omitted = [blueprintRecord("cristo-rei")];
    const ledger = buildCommercialLedger({ anchorTourId: ARRABIDA, kept, omitted });
    expect(ledger.entries.map((entry) => entry.blueprintStopId)).toEqual([
      ...kept.map((record) => record.blueprintStopId),
      ...omitted.map((record) => record.blueprintStopId),
    ]);
    expect(ledger.entries.map((entry) => entry.kind)).toEqual([
      ...kept.map(() => "kept"),
      ...omitted.map(() => "omitted"),
    ]);
    expect(kept).toHaveLength(6);
    expect(omitted).toHaveLength(1);
  });

  it("18 · the ledger exposes no euro/price amount field", () => {
    const ledger = buildCommercialLedger({
      anchorTourId: ARRABIDA,
      kept: [...arrabidaCore(), blueprintRecord("jmf"), blueprintRecord("bacalhoa")],
      omitted: [blueprintRecord("lunch-azeitao")],
    });
    const forbidden = /eur|price(?!action)|amount|total|cost|supplement|credit/i;
    const keys = [
      ...Object.keys(ledger),
      ...ledger.entries.flatMap((entry) => Object.keys(entry)),
      ...ledger.actions.flatMap((action) => Object.keys(action)),
    ];
    for (const key of keys) {
      expect(key.replace(/priceAction/g, ""), key).not.toMatch(forbidden);
    }
    const serialized = JSON.stringify(ledger);
    expect(serialized).not.toMatch(/"[a-zA-Z]*(Eur|EUR|eur)"\s*:/);
  });
});
